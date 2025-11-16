"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Trash2, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function AudioRecorder() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(50).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio context for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Start visualization
      updateVisualizer();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Stop visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.success("Recording started");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Failed to access microphone. Please check permissions.");
    }
  };

  const updateVisualizer = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Sample 50 points from the data
    const step = Math.floor(dataArray.length / 50);
    const sampledData = [];
    for (let i = 0; i < 50; i++) {
      const value = dataArray[i * step] || 0;
      sampledData.push(value);
    }

    setVisualizerData(sampledData);
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      toast.info("Recording paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.info("Recording resumed");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      toast.success("Recording stopped");
    }
  };

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setSessionTitle("");
    audioChunksRef.current = [];
    toast.info("Recording discarded");
  };

  const togglePlayback = () => {
    if (!audioElementRef.current) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleUpload = async () => {
    if (!audioBlob) return;

    setIsUploading(true);

    try {
      // Convert webm to a more compatible format if needed
      const formData = new FormData();
      const file = new File([audioBlob], "recording.webm", { type: "audio/webm" });
      formData.append("audio", file);
      if (sessionTitle) {
        formData.append("title", sessionTitle);
      }

      const response = await fetch("/api/sessions/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload recording");
      }

      toast.success("Recording uploaded! Processing...");
      discardRecording();
      router.push(`/sessions/${data.session.id}`);
      router.refresh();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload recording");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Audio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visualizer */}
        {isRecording && (
          <div className="h-24 bg-gray-100 rounded-lg flex items-end justify-around px-2 gap-1">
            {visualizerData.map((value, index) => (
              <div
                key={index}
                className="bg-primary rounded-t transition-all duration-100"
                style={{
                  height: `${Math.max(4, (value / 255) * 100)}%`,
                  width: "2%",
                }}
              />
            ))}
          </div>
        )}

        {/* Recording Controls */}
        {!audioBlob && (
          <div className="flex flex-col items-center gap-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                size="lg"
                className="rounded-full h-20 w-20"
              >
                <Mic className="h-8 w-8" />
              </Button>
            ) : (
              <div className="flex items-center gap-4">
                {isPaused ? (
                  <Button
                    onClick={resumeRecording}
                    size="lg"
                    variant="outline"
                    className="rounded-full h-16 w-16"
                  >
                    <Play className="h-6 w-6" />
                  </Button>
                ) : (
                  <Button
                    onClick={pauseRecording}
                    size="lg"
                    variant="outline"
                    className="rounded-full h-16 w-16"
                  >
                    <Pause className="h-6 w-6" />
                  </Button>
                )}

                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-16 w-16"
                >
                  <Square className="h-6 w-6" />
                </Button>
              </div>
            )}

            <div className="text-center">
              <div className="text-3xl font-mono font-bold">
                {formatTime(recordingTime)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isRecording
                  ? isPaused
                    ? "Paused"
                    : "Recording..."
                  : "Click microphone to start"}
              </p>
            </div>
          </div>
        )}

        {/* Playback and Upload */}
        {audioBlob && audioUrl && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <audio
                ref={audioElementRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <Button
                onClick={togglePlayback}
                size="lg"
                variant="outline"
                className="rounded-full h-16 w-16"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>

              <div className="text-center">
                <div className="text-2xl font-mono font-bold">
                  {formatTime(recordingTime)}
                </div>
                <p className="text-sm text-muted-foreground">Preview recording</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Session Title (Optional)</Label>
              <Input
                id="title"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g., Evening thoughts on EchoCtrl"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process
                  </>
                )}
              </Button>

              <Button
                onClick={discardRecording}
                disabled={isUploading}
                variant="outline"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Discard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
