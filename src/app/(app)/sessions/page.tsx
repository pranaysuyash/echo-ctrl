"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatDuration } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadAudioButton } from "@/components/upload-audio-button";
import { Calendar, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Session {
  id: string;
  title: string;
  status: string;
  duration: number;
  createdAt: string;
  topics: Array<{ name: string; slug: string }>;
  chunkCount: number;
  taskCount: number;
  errorMessage?: string;
}

export default function SessionsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["sessions", dateFrom, dateTo, topicFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (topicFilter) params.set("topic", topicFilter);
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/sessions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch sessions");
      return response.json();
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "READY":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      READY: "default",
      QUEUED: "secondary",
      TRANSCRIBING: "secondary",
      STRUCTURING: "secondary",
      EMBEDDING: "secondary",
      FAILED: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.toLowerCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sessions</h1>
        <UploadAudioButton />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., echo-ctrl"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="READY">Ready</option>
                <option value="QUEUED">Queued</option>
                <option value="TRANSCRIBING">Transcribing</option>
                <option value="STRUCTURING">Structuring</option>
                <option value="EMBEDDING">Embedding</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>
          {(dateFrom || dateTo || topicFilter || statusFilter) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setTopicFilter("");
                  setStatusFilter("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data?.sessions?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No sessions found</p>
            <UploadAudioButton className="mt-4" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data?.sessions?.map((session: Session) => (
            <Link key={session.id} href={`/sessions/${session.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(session.status)}
                        <h3 className="font-semibold text-lg">
                          {session.title || "Untitled Session"}
                        </h3>
                        {getStatusBadge(session.status)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                        {session.duration > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(session.duration)}
                          </div>
                        )}
                        {session.status === "READY" && (
                          <>
                            <span>•</span>
                            <span>{session.chunkCount} chunks</span>
                            <span>•</span>
                            <span>{session.taskCount} tasks</span>
                          </>
                        )}
                      </div>

                      {session.topics && session.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {session.topics.map((topic) => (
                            <Badge key={topic.slug} variant="secondary">
                              {topic.name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {session.status === "FAILED" && session.errorMessage && (
                        <p className="text-sm text-red-600">
                          Error: {session.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={data.pagination.page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={data.pagination.page >= data.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
