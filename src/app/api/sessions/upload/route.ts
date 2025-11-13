import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { storageService } from "@/services/storage";
import { addAudioProcessingJob } from "@/lib/queue";
import formidable from "formidable";
import fs from "fs/promises";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("audio") as File;
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Validate file type
    const validMimeTypes = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/wav", "audio/webm"];
    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported formats: mp3, m4a, wav, webm" },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 100MB" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file to storage
    const uploadResult = await storageService.uploadAudio(buffer, file.name, file.type);

    // Create audio session record
    const audioSession = await db.audioSession.create({
      data: {
        userId: session.user.id,
        title: title || null,
        fileUrl: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: file.size,
        mimeType: file.type,
        status: "QUEUED",
      },
    });

    // Add to processing queue
    await addAudioProcessingJob({
      sessionId: audioSession.id,
      userId: session.user.id,
    });

    return NextResponse.json(
      {
        session: {
          id: audioSession.id,
          title: audioSession.title,
          status: audioSession.status,
          createdAt: audioSession.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Audio upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload audio" },
      { status: 500 }
    );
  }
}
