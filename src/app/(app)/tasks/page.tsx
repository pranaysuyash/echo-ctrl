"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Circle, Trash2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

interface Task {
  id: string;
  description: string;
  status: "OPEN" | "DONE";
  priority: string;
  dueDate: string | null;
  createdAt: string;
  topics: Array<{ name: string; slug: string }>;
  session: {
    id: string;
    title: string;
    createdAt: string;
  } | null;
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [topicFilter, setTopicFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", statusFilter, topicFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (topicFilter) params.set("topic", topicFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/tasks?${params}`);
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const data = await response.json();
      return data.tasks as Task[];
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
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });

  const handleToggleTask = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "OPEN" ? "DONE" : "OPEN";
    updateTaskMutation.mutate({ taskId, status: newStatus });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const openTasks = tasks?.filter((t) => t.status === "OPEN") || [];
  const doneTasks = tasks?.filter((t) => t.status === "DONE") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            {openTasks.length} open, {doneTasks.length} completed
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="DONE">Done</option>
              </select>
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
          </div>
          {(topicFilter || dateFrom || dateTo) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTopicFilter("");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Open Tasks */}
          {statusFilter !== "DONE" && openTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Open Tasks ({openTasks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {openTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <button
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        <Circle className="h-5 w-5 text-gray-400 hover:text-primary" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{task.description}</p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {task.priority && (
                            <Badge
                              variant={
                                task.priority === "high"
                                  ? "destructive"
                                  : task.priority === "medium"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {task.priority}
                            </Badge>
                          )}

                          {task.topics.map((topic) => (
                            <Badge key={topic.slug} variant="outline">
                              {topic.name}
                            </Badge>
                          ))}

                          {task.session && (
                            <Link
                              href={`/sessions/${task.session.id}`}
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {task.session.title || "View session"}
                            </Link>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-2">
                          Created {new Date(task.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Tasks */}
          {statusFilter !== "OPEN" && doneTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Completed Tasks ({doneTasks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {doneTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50"
                    >
                      <button
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-through text-muted-foreground">
                          {task.description}
                        </p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {task.topics.map((topic) => (
                            <Badge key={topic.slug} variant="outline">
                              {topic.name}
                            </Badge>
                          ))}

                          {task.session && (
                            <Link
                              href={`/sessions/${task.session.id}`}
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {task.session.title || "View session"}
                            </Link>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
