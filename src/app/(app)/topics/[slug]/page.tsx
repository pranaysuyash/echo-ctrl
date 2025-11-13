"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, Clock, CheckSquare, Circle } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface TopicSession {
  id: string;
  title: string;
  createdAt: string;
  duration: number;
  relevance: number;
  summary: string | null;
  chunkCount: number;
  taskCount: number;
  notePreview: string | null;
}

interface TopicTask {
  id: string;
  description: string;
  status: "OPEN" | "DONE";
  priority: string;
  createdAt: string;
}

interface TopicData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  timelineSummary: string | null;
  sessions: TopicSession[];
  tasks: TopicTask[];
}

export default function TopicTimelinePage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: topic, isLoading } = useQuery({
    queryKey: ["topic", slug],
    queryFn: async () => {
      const response = await fetch(`/api/topics/${slug}`);
      if (!response.ok) throw new Error("Failed to fetch topic");
      const data = await response.json();
      return data.topic as TopicData;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-bold">Topic not found</h2>
        <Link href="/topics">
          <Button variant="outline" className="mt-4">
            Back to Topics
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/topics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{topic.name}</h1>
          {topic.description && (
            <p className="text-muted-foreground mt-1">{topic.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{topic.sessions.length}</div>
            <p className="text-sm text-muted-foreground">Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {topic.tasks.filter((t) => t.status === "OPEN").length}
            </div>
            <p className="text-sm text-muted-foreground">Open Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatDuration(
                topic.sessions.reduce((sum, s) => sum + s.duration, 0)
              )}
            </div>
            <p className="text-sm text-muted-foreground">Total Duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Summary */}
      {topic.timelineSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{topic.timelineSummary}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline - Left Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Timeline</h2>

          {topic.sessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No sessions for this topic yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {topic.sessions.map((session) => (
                <Link key={session.id} href={`/sessions/${session.id}`}>
                  <Card className="hover:bg-accent transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-base">
                          {session.title || "Untitled Session"}
                        </CardTitle>
                        {session.relevance && (
                          <Badge variant="secondary">
                            {Math.round(session.relevance * 100)}% relevant
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                        {session.duration > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(session.duration)}
                          </span>
                        )}
                        <span>• {session.chunkCount} chunks</span>
                        {session.taskCount > 0 && (
                          <span>• {session.taskCount} tasks</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    {(session.summary || session.notePreview) && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {session.summary || session.notePreview}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tasks Sidebar - Right Column */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Related Tasks</h2>

          {topic.tasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <p>No tasks for this topic</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {topic.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      {task.status === "DONE" ? (
                        <CheckSquare className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p
                          className={
                            task.status === "DONE"
                              ? "line-through text-muted-foreground"
                              : ""
                          }
                        >
                          {task.description}
                        </p>
                        {task.priority && task.status === "OPEN" && (
                          <Badge
                            variant="outline"
                            className="mt-1 text-xs"
                          >
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
    </div>
  );
}
