import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { embeddingService } from "@/services/embeddings";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().min(1),
  mode: z.enum(["text", "semantic", "both"]).optional().default("both"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const params = searchSchema.parse({
      q: searchParams.get("q") || "",
      mode: searchParams.get("mode") || undefined,
    });

    const results: any = {
      sessions: [],
      chunks: [],
      tasks: [],
    };

    // Text search
    if (params.mode === "text" || params.mode === "both") {
      // Search in transcripts and session notes
      const sessions = await db.audioSession.findMany({
        where: {
          userId: session.user.id,
          status: "READY",
          OR: [
            {
              title: {
                contains: params.q,
                mode: "insensitive",
              },
            },
            {
              transcript: {
                cleanedText: {
                  contains: params.q,
                  mode: "insensitive",
                },
              },
            },
            {
              sessionNote: {
                content: {
                  contains: params.q,
                  mode: "insensitive",
                },
              },
            },
          ],
        },
        include: {
          topics: {
            include: {
              topic: true,
            },
          },
          sessionNote: true,
        },
        take: 20,
      });

      results.sessions = sessions.map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        topics: s.topics.map((t) => t.topic.slug),
        notePreview: s.sessionNote?.content.slice(0, 200),
        matchType: "text",
      }));

      // Search in tasks
      const tasks = await db.task.findMany({
        where: {
          userId: session.user.id,
          description: {
            contains: params.q,
            mode: "insensitive",
          },
        },
        include: {
          audioSession: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        take: 20,
      });

      results.tasks = tasks.map((t) => ({
        id: t.id,
        description: t.description,
        status: t.status,
        sessionId: t.audioSession?.id,
        sessionTitle: t.audioSession?.title,
        matchType: "text",
      }));
    }

    // Semantic search
    if (params.mode === "semantic" || params.mode === "both") {
      const similarResults = await embeddingService.searchSimilar(
        params.q,
        10,
        session.user.id
      );

      // Get full session details for similar results
      const sessionIds = Array.from(
        new Set(similarResults.filter((r) => r.sessionId).map((r) => r.sessionId!))
      );

      if (sessionIds.length > 0) {
        const semanticSessions = await db.audioSession.findMany({
          where: {
            id: {
              in: sessionIds,
            },
          },
          include: {
            topics: {
              include: {
                topic: true,
              },
            },
            sessionNote: true,
          },
        });

        const semanticSessionResults = semanticSessions.map((s) => {
          const match = similarResults.find((r) => r.sessionId === s.id);
          return {
            id: s.id,
            title: s.title,
            createdAt: s.createdAt,
            topics: s.topics.map((t) => t.topic.slug),
            notePreview: s.sessionNote?.content.slice(0, 200),
            matchType: "semantic",
            similarity: match?.similarity || 0,
          };
        });

        // Merge with text results if both modes
        if (params.mode === "both") {
          const existingIds = new Set(results.sessions.map((s: any) => s.id));
          for (const s of semanticSessionResults) {
            if (!existingIds.has(s.id)) {
              results.sessions.push(s);
            }
          }
        } else {
          results.sessions = semanticSessionResults;
        }
      }
    }

    // Sort by relevance (similarity for semantic, date for text)
    results.sessions.sort((a: any, b: any) => {
      if (a.similarity !== undefined && b.similarity !== undefined) {
        return b.similarity - a.similarity;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
