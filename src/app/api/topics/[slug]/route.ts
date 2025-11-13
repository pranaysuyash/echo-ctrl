import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const topic = await db.topic.findUnique({
      where: { slug: params.slug },
      include: {
        audioSessions: {
          where: {
            audioSession: {
              userId: session.user.id,
              status: "READY",
            },
          },
          include: {
            audioSession: {
              include: {
                sessionNote: true,
                _count: {
                  select: {
                    chunks: true,
                    tasks: true,
                  },
                },
              },
            },
          },
          orderBy: {
            audioSession: {
              createdAt: "desc",
            },
          },
        },
        tasks: {
          where: {
            task: {
              userId: session.user.id,
            },
          },
          include: {
            task: true,
          },
        },
      },
    });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    return NextResponse.json({
      topic: {
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
        description: topic.description,
        timelineSummary: topic.timelineSummary,
        sessions: topic.audioSessions.map((as) => ({
          id: as.audioSession.id,
          title: as.audioSession.title,
          createdAt: as.audioSession.createdAt,
          duration: as.audioSession.duration,
          relevance: as.relevance,
          summary: as.summary,
          chunkCount: as.audioSession._count.chunks,
          taskCount: as.audioSession._count.tasks,
          notePreview: as.audioSession.sessionNote?.content.slice(0, 200),
        })),
        tasks: topic.tasks.map((tt) => ({
          id: tt.task.id,
          description: tt.task.description,
          status: tt.task.status,
          priority: tt.task.priority,
          createdAt: tt.task.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Topic fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch topic" },
      { status: 500 }
    );
  }
}
