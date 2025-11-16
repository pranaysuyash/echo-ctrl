import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
        sessionNote: true,
        transcript: true,
        topics: {
          include: {
            topic: true,
          },
        },
        tasks: true,
        chunks: {
          orderBy: {
            chunkIndex: "asc",
          },
        },
      },
    });

    if (!audioSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (audioSession.status !== "READY") {
      return NextResponse.json(
        { error: "Session not ready for export" },
        { status: 400 }
      );
    }

    // Build markdown content
    let markdown = `# ${audioSession.title || "Untitled Session"}\n\n`;
    markdown += `**Date:** ${audioSession.createdAt.toLocaleDateString()}\n`;
    if (audioSession.duration) {
      markdown += `**Duration:** ${Math.floor(audioSession.duration / 60)}m ${audioSession.duration % 60}s\n`;
    }

    if (audioSession.topics.length > 0) {
      markdown += `**Topics:** ${audioSession.topics.map((t) => t.topic.name).join(", ")}\n`;
    }

    markdown += `\n---\n\n`;

    // Add session note if available
    if (audioSession.sessionNote) {
      markdown += audioSession.sessionNote.content;
      markdown += `\n\n---\n\n`;
    }

    // Add chunks
    if (audioSession.chunks.length > 0) {
      markdown += `## Chunks\n\n`;
      for (const chunk of audioSession.chunks) {
        markdown += `### ${chunk.title}\n\n`;
        markdown += `${chunk.summary}\n\n`;
        markdown += `${chunk.content}\n\n`;
      }
      markdown += `---\n\n`;
    }

    // Add tasks
    if (audioSession.tasks.length > 0) {
      markdown += `## Tasks\n\n`;
      for (const task of audioSession.tasks) {
        const checkbox = task.status === "DONE" ? "[x]" : "[ ]";
        markdown += `- ${checkbox} ${task.description}\n`;
      }
      markdown += `\n---\n\n`;
    }

    // Add full transcript
    if (audioSession.transcript) {
      markdown += `## Full Transcript\n\n`;
      markdown += audioSession.transcript.cleanedText || audioSession.transcript.rawText;
    }

    // Return as downloadable file
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="${audioSession.title || "session"}.md"`,
      },
    });
  } catch (error) {
    console.error("Export session error:", error);
    return NextResponse.json(
      { error: "Failed to export session" },
      { status: 500 }
    );
  }
}
