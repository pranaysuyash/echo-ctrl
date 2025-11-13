import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { llmService } from "@/services/llm";
import { embeddingService } from "@/services/embeddings";
import { extractTimeRange } from "@/lib/utils";
import { z } from "zod";

const querySchema = z.object({
  query: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { query } = querySchema.parse(body);

    // Extract time range from query
    const { dateFrom, dateTo, queryWithoutTime } = extractTimeRange(query);

    // Get semantically similar content
    const similarResults = await embeddingService.searchSimilar(
      queryWithoutTime,
      10,
      session.user.id
    );

    // Build context from similar results
    const sessionIds = Array.from(
      new Set(similarResults.filter((r) => r.sessionId).map((r) => r.sessionId!))
    );

    let relevantSessions = [];
    if (sessionIds.length > 0) {
      const where: any = {
        id: {
          in: sessionIds,
        },
        status: "READY",
      };

      // Apply time filters if extracted
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = dateFrom;
        }
        if (dateTo) {
          where.createdAt.lte = dateTo;
        }
      }

      relevantSessions = await db.audioSession.findMany({
        where,
        include: {
          sessionNote: true,
          topics: {
            include: {
              topic: true,
            },
          },
          chunks: {
            orderBy: {
              chunkIndex: "asc",
            },
          },
        },
        take: 5,
      });
    }

    // Build context strings
    const context: string[] = [];
    for (const sess of relevantSessions) {
      const topicNames = sess.topics.map((t) => t.topic.name).join(", ");
      const date = sess.createdAt.toLocaleDateString();

      let contextStr = `Session: ${sess.title || "Untitled"}\nDate: ${date}\nTopics: ${topicNames}\n\n`;

      if (sess.sessionNote) {
        contextStr += sess.sessionNote.content;
      } else if (sess.chunks.length > 0) {
        contextStr += sess.chunks
          .map((c) => `${c.title}\n${c.summary}`)
          .join("\n\n");
      }

      context.push(contextStr);
    }

    // Generate answer using LLM
    const answer = await llmService.answerQuery(query, context);

    // Save query for history
    await db.query.create({
      data: {
        userId: session.user.id,
        queryText: query,
        answer,
        sessionIds: sessionIds,
      },
    });

    return NextResponse.json({
      answer,
      references: relevantSessions.map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        topics: s.topics.map((t) => t.topic.slug),
        notePreview: s.sessionNote?.content.slice(0, 200),
      })),
    });
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json(
      { error: "Failed to process query" },
      { status: 500 }
    );
  }
}
