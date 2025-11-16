"use client";

import { useState } from "react";
import { AudioRecorder } from "./audio-recorder";
import { UploadAudioButton } from "./upload-audio-button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Mic, Upload } from "lucide-react";

export function RecordAudioSection() {
  const [mode, setMode] = useState<"choice" | "record" | "upload">("choice");

  if (mode === "record") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setMode("choice")} size="sm">
          ← Back
        </Button>
        <AudioRecorder />
      </div>
    );
  }

  if (mode === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload Audio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="ghost" onClick={() => setMode("choice")} size="sm">
            ← Back
          </Button>
          <div className="text-center py-8">
            <UploadAudioButton />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capture Your Thoughts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("record")}
            className="p-6 border-2 border-dashed rounded-lg hover:bg-accent transition-colors text-center"
          >
            <Mic className="h-12 w-12 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-1">Record Audio</h3>
            <p className="text-sm text-muted-foreground">
              Record directly from your microphone
            </p>
          </button>

          <button
            onClick={() => setMode("upload")}
            className="p-6 border-2 border-dashed rounded-lg hover:bg-accent transition-colors text-center"
          >
            <Upload className="h-12 w-12 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-1">Upload File</h3>
            <p className="text-sm text-muted-foreground">
              Upload an existing audio file
            </p>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
