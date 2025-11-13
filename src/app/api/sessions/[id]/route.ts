import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().optional(),
  topics: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const audioSession = await db.audioSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        transcript: {
          include: {
            segments: {
              orderBy: {
                startTime: "asc",
              },
            },
          },
        },
        chunks: {
          orderBy: {
            chunkIndex: "asc",
          },
        },
        sessionNote: true,
        topics: {
          include: {
            topic: true,
          },
        },
        tasks: {
          include: {
            topics: {
              include: {
                topic: true,
              },
            },
          },
        },
      },
    });

    if (!audioSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      session: {
        id: audioSession.id,
        title: audioSession.title,
        status: audioSession.status,
        duration: audioSession.duration,
        fileUrl: audioSession.fileUrl,
        createdAt: audioSession.createdAt,
        errorMessage: audioSession.errorMessage,
        transcript: audioSession.transcript
          ? {
              text: audioSession.transcript.cleanedText || audioSession.transcript.rawText,
              language: audioSession.transcript.language,
              segments: audioSession.transcript.segments,
            }
          : null,
        chunks: audioSession.chunks.map((c) => ({
          id: c.id,
          title: c.title,
          summary: c.summary,
          content: c.content,
          startTime: c.startTime,
          endTime: c.endTime,
        })),
        note: audioSession.sessionNote
          ? {
              content: audioSession.sessionNote.content,
              isEdited: audioSession.sessionNote.isEdited,
            }
          : null,
        topics: audioSession.topics.map((t) => ({
          name: t.topic.name,
          slug: t.topic.slug,
          relevance: t.relevance,
        })),
        tasks: audioSession.tasks.map((t) => ({
          id: t.id,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          topics: t.topics.map((tt) => tt.topic.slug),
        })),
      },
    });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, topics } = updateSchema.parse(body);

    // Verify ownership
    const audioSession = await db.audioSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!audioSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Update title if provided
    if (title !== undefined) {
      await db.audioSession.update({
        where: { id: params.id },
        data: { title },
      });
    }

    // Update topics if provided
    if (topics) {
      // Remove existing topic associations
      await db.audioSessionTopic.deleteMany({
        where: { audioSessionId: params.id },
      });

      // Add new topic associations
      for (const topicSlug of topics) {
        let topic = await db.topic.findUnique({ where: { slug: topicSlug } });

        if (!topic) {
          topic = await db.topic.create({
            data: {
              name: topicSlug,
              slug: topicSlug,
            },
          });
        }

        await db.audioSessionTopic.create({
          data: {
            audioSessionId: params.id,
            topicId: topic.id,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session update error:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
