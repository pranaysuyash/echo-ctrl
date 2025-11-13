"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface UploadAudioButtonProps {
  className?: string;
}

export function UploadAudioButton({ className }: UploadAudioButtonProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/wav", "audio/webm"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload an audio file (mp3, m4a, wav, or webm)");
      return;
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 100MB");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const response = await fetch("/api/sessions/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload audio");
      }

      toast.success("Audio uploaded successfully! Processing...");
      router.push(`/sessions/${data.session.id}`);
      router.refresh();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload audio");
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <label>
        <input
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
        <Button
          type="button"
          disabled={isUploading}
          onClick={() => {
            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            input?.click();
          }}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Uploading..." : "Upload Audio"}
        </Button>
      </label>
    </div>
  );
}
