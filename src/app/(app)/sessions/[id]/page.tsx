"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { AudioPlayer } from "@/components/audio-player";
import { TranscriptViewer } from "@/components/transcript-viewer";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Edit2, Save, X, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { formatDuration } from "@/lib/utils";

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const queryClient = useQueryClient();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [activeView, setActiveView] = useState("transcript");

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch session");
      const data = await response.json();
      return data.session;
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error("Failed to update title");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      toast.success("Title updated");
      setIsEditingTitle(false);
    },
    onError: () => {
      toast.error("Failed to update title");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      toast.success("Task updated");
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      updateTitleMutation.mutate(editedTitle);
    }
  };

  const handleToggleTask = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "OPEN" ? "DONE" : "OPEN";
    updateTaskMutation.mutate({ taskId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold">Session not found</h2>
      </div>
    );
  }

  const isProcessing = !["READY", "FAILED"].includes(session.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-2xl font-bold"
                  autoFocus
                />
                <Button size="icon" onClick={handleSaveTitle}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setIsEditingTitle(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">
                  {session.title || "Untitled Session"}
                </h1>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditedTitle(session.title || "");
                    setIsEditingTitle(true);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Badge
            variant={
              session.status === "READY"
                ? "default"
                : session.status === "FAILED"
                ? "destructive"
                : "secondary"
            }
          >
            {session.status}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{new Date(session.createdAt).toLocaleString()}</span>
          {session.duration > 0 && (
            <>
              <span>•</span>
              <span>{formatDuration(session.duration)}</span>
            </>
          )}
        </div>

        {session.topics && session.topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {session.topics.map((topic: any) => (
              <Badge key={topic.slug} variant="secondary">
                {topic.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="font-medium">Processing in progress...</p>
              <p className="text-sm text-muted-foreground">
                Current stage: {session.status}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Status */}
      {session.status === "FAILED" && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <p className="font-medium text-red-900">Processing failed</p>
            {session.errorMessage && (
              <p className="text-sm text-red-700 mt-1">{session.errorMessage}</p>
            )}
          </CardContent>
        </Card>
      )}

      {session.status === "READY" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Audio Player */}
            <Card>
              <CardHeader>
                <CardTitle>Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <AudioPlayer
                  audioUrl={session.fileUrl}
                  onTimeUpdate={setCurrentTime}
                />
              </CardContent>
            </Card>

            {/* Tabs for Transcript/Note */}
            <Card>
              <CardHeader>
                <Tabs value={activeView} onValueChange={setActiveView}>
                  <TabsList>
                    <TabsTrigger value="transcript">Transcript</TabsTrigger>
                    <TabsTrigger value="note">Session Note</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                {activeView === "transcript" && session.transcript && (
                  <TranscriptViewer
                    segments={session.transcript.segments || []}
                    currentTime={currentTime}
                  />
                )}

                {activeView === "note" && session.note && (
                  <div className="prose-container">
                    <MarkdownRenderer content={session.note.content} />
                  </div>
                )}

                {activeView === "transcript" && !session.transcript && (
                  <p className="text-center py-8 text-muted-foreground">
                    No transcript available
                  </p>
                )}

                {activeView === "note" && !session.note && (
                  <p className="text-center py-8 text-muted-foreground">
                    No session note available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Chunks */}
            {session.chunks && session.chunks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Chunks ({session.chunks.length})
                  </CardTitle>
                  <CardDescription>Logical sections of this session</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {session.chunks.map((chunk: any) => (
                      <div
                        key={chunk.id}
                        className="p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                      >
                        <h4 className="font-medium text-sm">{chunk.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {chunk.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tasks */}
            {session.tasks && session.tasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Tasks ({session.tasks.filter((t: any) => t.status === "OPEN").length}/
                    {session.tasks.length})
                  </CardTitle>
                  <CardDescription>Extracted actionable items</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {session.tasks.map((task: any) => (
                      <div key={task.id} className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleTask(task.id, task.status)}
                          className="mt-0.5"
                        >
                          {task.status === "DONE" ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300 hover:border-primary transition-colors" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p
                            className={`text-sm ${
                              task.status === "DONE"
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {task.description}
                          </p>
                          {task.priority && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
