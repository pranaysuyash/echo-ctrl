import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all topics for this user's sessions
    const topics = await db.topic.findMany({
      where: {
        audioSessions: {
          some: {
            audioSession: {
              userId: session.user.id,
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            audioSessions: {
              where: {
                audioSession: {
                  userId: session.user.id,
                  status: "READY",
                },
              },
            },
            tasks: {
              where: {
                task: {
                  userId: session.user.id,
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      topics: topics.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        sessionCount: t._count.audioSessions,
        taskCount: t._count.tasks,
      })),
    });
  } catch (error) {
    console.error("Topics fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}
