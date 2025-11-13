import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const querySchema = z.object({
  status: z.enum(["OPEN", "DONE"]).optional(),
  topic: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const params = querySchema.parse({
      status: searchParams.get("status") || undefined,
      topic: searchParams.get("topic") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    });

    const where: any = {
      userId: session.user.id,
    };

    if (params.status) {
      where.status = params.status;
    }

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.createdAt.lte = new Date(params.dateTo);
      }
    }

    if (params.topic) {
      where.topics = {
        some: {
          topic: {
            slug: params.topic,
          },
        },
      };
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        topics: {
          include: {
            topic: true,
          },
        },
        audioSession: {
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
        chunk: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        topics: t.topics.map((tt) => ({
          name: tt.topic.name,
          slug: tt.topic.slug,
        })),
        session: t.audioSession
          ? {
              id: t.audioSession.id,
              title: t.audioSession.title,
              createdAt: t.audioSession.createdAt,
            }
          : null,
        chunk: t.chunk
          ? {
              id: t.chunk.id,
              title: t.chunk.title,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Tasks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
