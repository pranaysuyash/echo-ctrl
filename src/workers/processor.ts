import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { transcriptionService } from "@/services/transcription";
import { llmService } from "@/services/llm";
import { embeddingService } from "@/services/embeddings";
import { slugify } from "@/lib/utils";
import type { ProcessAudioJobData, DailySummaryJobData, WeeklySummaryJobData } from "@/lib/queue";

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Audio Processing Worker
const audioWorker = new Worker<ProcessAudioJobData>(
  "audio-processing",
  async (job: Job<ProcessAudioJobData>) => {
    const { sessionId, userId } = job.data;

    try {
      console.log(`Processing audio session ${sessionId}...`);

      // Get session
      const session = await db.audioSession.findUnique({
        where: { id: sessionId },
        include: {
          user: {
            include: {
              settings: true,
            },
          },
        },
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Update status to TRANSCRIBING
      await db.audioSession.update({
        where: { id: sessionId },
        data: { status: "TRANSCRIBING" },
      });

      // Step 1: Transcribe
      job.updateProgress(25);
      const language = session.user.settings?.defaultLanguage || "en";
      const transcriptionResult = await transcriptionService.transcribe(session.fileUrl, language);

      // Save transcript
      const transcript = await db.transcript.create({
        data: {
          audioSessionId: sessionId,
          rawText: transcriptionResult.rawText,
          cleanedText: transcriptionResult.cleanedText,
          language: transcriptionResult.language,
          segments: {
            create: transcriptionResult.segments.map((seg) => ({
              startTime: seg.startTime,
              endTime: seg.endTime,
              text: seg.text,
            })),
          },
        },
      });

      // Update status to STRUCTURING
      await db.audioSession.update({
        where: { id: sessionId },
        data: { status: "STRUCTURING" },
      });

      // Step 2: Structure with LLM
      job.updateProgress(50);
      const structured = await llmService.structureTranscript(
        transcriptionResult.cleanedText,
        transcriptionResult.segments
      );

      // Save chunks
      const chunks = await Promise.all(
        structured.chunks.map((chunkData) =>
          db.chunk.create({
            data: {
              audioSessionId: sessionId,
              chunkIndex: chunkData.chunkIndex,
              title: chunkData.title,
              summary: chunkData.summary,
              content: chunkData.content,
              startTime: chunkData.startTime,
              endTime: chunkData.endTime,
            },
          })
        )
      );

      // Save or get topics
      const topicIds: string[] = [];
      for (const topicData of structured.topics) {
        const slug = slugify(topicData.name);
        let topic = await db.topic.findUnique({ where: { slug } });

        if (!topic) {
          topic = await db.topic.create({
            data: {
              name: topicData.name,
              slug,
            },
          });
        }

        topicIds.push(topic.id);

        // Link topic to session
        await db.audioSessionTopic.create({
          data: {
            audioSessionId: sessionId,
            topicId: topic.id,
            relevance: topicData.relevance,
          },
        });
      }

      // Save tasks
      const tasks = await Promise.all(
        structured.tasks.map((taskData) =>
          db.task.create({
            data: {
              userId,
              audioSessionId: sessionId,
              description: taskData.description,
              priority: taskData.priority || "medium",
              status: "OPEN",
            },
          })
        )
      );

      // Link tasks to topics
      for (const task of tasks) {
        for (const topicId of topicIds) {
          await db.taskTopic.create({
            data: {
              taskId: task.id,
              topicId,
            },
          });
        }
      }

      // Step 3: Generate session note
      job.updateProgress(70);
      const verbosity = session.user.settings?.noteVerbosity || "normal";
      const noteData = await llmService.generateSessionNote(
        transcriptionResult.cleanedText,
        structured.chunks,
        structured.topics.map((t) => t.name),
        structured.tasks,
        verbosity as "concise" | "normal" | "detailed"
      );

      await db.sessionNote.create({
        data: {
          audioSessionId: sessionId,
          content: noteData.content,
        },
      });

      // Update session title if not set
      if (!session.title) {
        await db.audioSession.update({
          where: { id: sessionId },
          data: { title: noteData.title },
        });
      }

      // Update status to EMBEDDING
      await db.audioSession.update({
        where: { id: sessionId },
        data: { status: "EMBEDDING" },
      });

      // Step 4: Generate embeddings
      job.updateProgress(85);

      // Embed session note
      await embeddingService.generateAndStoreSessionEmbedding(sessionId, noteData.content);

      // Embed each chunk
      for (const chunk of chunks) {
        await embeddingService.generateAndStoreChunkEmbedding(
          chunk.id,
          `${chunk.title}\n\n${chunk.summary}\n\n${chunk.content}`
        );
      }

      // Update status to READY
      await db.audioSession.update({
        where: { id: sessionId },
        data: { status: "READY" },
      });

      job.updateProgress(100);
      console.log(`Successfully processed audio session ${sessionId}`);

      return { sessionId, status: "READY" };
    } catch (error) {
      console.error(`Error processing session ${sessionId}:`, error);

      // Update status to FAILED
      await db.audioSession.update({
        where: { id: sessionId },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

// Daily Summary Worker
const dailySummaryWorker = new Worker<DailySummaryJobData>(
  "daily-summary",
  async (job: Job<DailySummaryJobData>) => {
    const { userId, date } = job.data;

    try {
      console.log(`Generating daily summary for user ${userId} on ${date}...`);

      const dateObj = new Date(date);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);

      // Get all sessions for this day
      const sessions = await db.audioSession.findMany({
        where: {
          userId,
          status: "READY",
          createdAt: {
            gte: dateObj,
            lt: nextDay,
          },
        },
        include: {
          topics: {
            include: {
              topic: true,
            },
          },
          tasks: true,
        },
      });

      if (sessions.length === 0) {
        return { message: "No sessions for this day" };
      }

      // Calculate stats
      const sessionCount = sessions.length;
      const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const taskCount = sessions.reduce((sum, s) => sum + s.tasks.length, 0);

      // Get top topics
      const topicCounts = new Map<string, number>();
      for (const session of sessions) {
        for (const st of session.topics) {
          const slug = st.topic.slug;
          topicCounts.set(slug, (topicCounts.get(slug) || 0) + 1);
        }
      }

      const topTopics = Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([slug]) => slug);

      // Generate summary using LLM (simplified for now)
      const summary = `Recorded ${sessionCount} session${sessionCount > 1 ? "s" : ""} covering ${topTopics.join(", ")}.`;

      // Save or update daily summary
      await db.dailySummary.upsert({
        where: {
          userId_date: {
            userId,
            date: dateObj,
          },
        },
        create: {
          userId,
          date: dateObj,
          sessionCount,
          totalDuration,
          topTopics,
          taskCount,
          summary,
        },
        update: {
          sessionCount,
          totalDuration,
          topTopics,
          taskCount,
          summary,
        },
      });

      console.log(`Daily summary generated for user ${userId} on ${date}`);
      return { userId, date, sessionCount };
    } catch (error) {
      console.error(`Error generating daily summary:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1,
  }
);

// Handle worker events
audioWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

audioWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

dailySummaryWorker.on("completed", (job) => {
  console.log(`Daily summary job ${job.id} completed`);
});

dailySummaryWorker.on("failed", (job, err) => {
  console.error(`Daily summary job ${job?.id} failed:`, err);
});

console.log("Workers started and listening for jobs...");

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down workers...");
  await audioWorker.close();
  await dailySummaryWorker.close();
  await connection.quit();
  process.exit(0);
});
