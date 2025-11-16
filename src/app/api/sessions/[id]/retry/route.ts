import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addAudioProcessingJob } from "@/lib/queue";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership and get session
    const audioSession = await db.audioSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!audioSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (audioSession.status !== "FAILED") {
      return NextResponse.json(
        { error: "Can only retry failed sessions" },
        { status: 400 }
      );
    }

    // Reset status and clear error
    await db.audioSession.update({
      where: { id: params.id },
      data: {
        status: "QUEUED",
        errorMessage: null,
      },
    });

    // Add back to processing queue
    await addAudioProcessingJob({
      sessionId: params.id,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, message: "Session queued for retry" });
  } catch (error) {
    console.error("Retry session error:", error);
    return NextResponse.json(
      { error: "Failed to retry session" },
      { status: 500 }
    );
  }
}
