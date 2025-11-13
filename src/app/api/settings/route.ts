import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  defaultLanguage: z.string().optional(),
  noteVerbosity: z.enum(["concise", "normal", "detailed"]).optional(),
  customOpenAIKey: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await db.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      // Create default settings
      const newSettings = await db.userSettings.create({
        data: {
          userId: session.user.id,
        },
      });
      return NextResponse.json({ settings: newSettings });
    }

    return NextResponse.json({
      settings: {
        defaultLanguage: settings.defaultLanguage,
        noteVerbosity: settings.noteVerbosity,
        hasCustomOpenAIKey: !!settings.customOpenAIKey,
      },
    });
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    const updated = await db.userSettings.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        ...data,
      },
    });

    return NextResponse.json({
      settings: {
        defaultLanguage: updated.defaultLanguage,
        noteVerbosity: updated.noteVerbosity,
        hasCustomOpenAIKey: !!updated.customOpenAIKey,
      },
    });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
