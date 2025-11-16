import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const querySchema = z.object({
  date: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const params = querySchema.parse({
      date: searchParams.get("date") || undefined,
    });

    const targetDate = params.date ? new Date(params.date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Try to get existing summary
    let summary = await db.dailySummary.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: targetDate,
        },
      },
    });

    // If no summary exists, generate one on the fly
    if (!summary) {
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const sessions = await db.audioSession.findMany({
        where: {
          userId: session.user.id,
          status: "READY",
          createdAt: {
            gte: targetDate,
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

      const sessionCount = sessions.length;
      const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const taskCount = sessions.reduce((sum, s) => sum + s.tasks.length, 0);

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

      summary = {
        id: "temp",
        userId: session.user.id,
        date: targetDate,
        sessionCount,
        totalDuration,
        topTopics,
        taskCount,
        summary: sessionCount > 0
          ? `Recorded ${sessionCount} session${sessionCount > 1 ? "s" : ""} covering ${topTopics.join(", ")}.`
          : "No sessions recorded today.",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Daily summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily summary" },
      { status: 500 }
    );
  }
}
