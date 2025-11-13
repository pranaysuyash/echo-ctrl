import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const querySchema = z.object({
  page: z.string().optional().default("1"),
  pageSize: z.string().optional().default("20"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  topic: z.string().optional(),
  status: z.enum(["QUEUED", "TRANSCRIBING", "STRUCTURING", "EMBEDDING", "READY", "FAILED"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const params = querySchema.parse({
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      topic: searchParams.get("topic") || undefined,
      status: searchParams.get("status") || undefined,
    });

    const page = parseInt(params.page);
    const pageSize = parseInt(params.pageSize);
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {
      userId: session.user.id,
    };

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.createdAt.lte = new Date(params.dateTo);
      }
    }

    if (params.status) {
      where.status = params.status;
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

    // Get sessions
    const [sessions, total] = await Promise.all([
      db.audioSession.findMany({
        where,
        include: {
          topics: {
            include: {
              topic: true,
            },
          },
          tasks: {
            where: {
              status: "OPEN",
            },
          },
          _count: {
            select: {
              chunks: true,
              tasks: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
      }),
      db.audioSession.count({ where }),
    ]);

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        duration: s.duration,
        createdAt: s.createdAt,
        topics: s.topics.map((t) => ({
          name: t.topic.name,
          slug: t.topic.slug,
        })),
        chunkCount: s._count.chunks,
        taskCount: s._count.tasks,
        errorMessage: s.errorMessage,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Sessions list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
