import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import { Mic, ListTodo, Tag, TrendingUp } from "lucide-react";
import Link from "next/link";
import { UploadAudioButton } from "@/components/upload-audio-button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  // Get recent sessions
  const recentSessions = await db.audioSession.findMany({
    where: {
      userId: session.user.id,
      status: "READY",
    },
    include: {
      topics: {
        include: {
          topic: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  // Get open tasks
  const openTasks = await db.task.findMany({
    where: {
      userId: session.user.id,
      status: "OPEN",
    },
    include: {
      audioSession: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  // Get stats for this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weekStats = await db.audioSession.aggregate({
    where: {
      userId: session.user.id,
      status: "READY",
      createdAt: {
        gte: weekAgo,
      },
    },
    _count: true,
    _sum: {
      duration: true,
    },
  });

  // Get top topics
  const topTopics = await db.topic.findMany({
    where: {
      audioSessions: {
        some: {
          audioSession: {
            userId: session.user.id,
            status: "READY",
            createdAt: {
              gte: weekAgo,
            },
          },
        },
      },
    },
    include: {
      _count: {
        select: {
          audioSessions: {
            where: {
              audioSession: {
                userId: session.user.id,
                status: "READY",
                createdAt: {
                  gte: weekAgo,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      audioSessions: {
        _count: "desc",
      },
    },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <UploadAudioButton />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions This Week</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekStats._count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatDuration(weekStats._sum.duration || 0)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTasks.length}</div>
            <p className="text-xs text-muted-foreground">Across all sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Topics</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topTopics.length}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weekStats._count > 0
                ? formatDuration(
                    Math.floor((weekStats._sum.duration || 0) / weekStats._count)
                  )
                : "0:00"}
            </div>
            <p className="text-xs text-muted-foreground">Per session</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Sessions</CardTitle>
            <Link href="/sessions">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
          <CardDescription>Your latest recorded thinking sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSessions.length > 0 ? (
            <div className="space-y-4">
              {recentSessions.map((sess) => (
                <Link
                  key={sess.id}
                  href={`/sessions/${sess.id}`}
                  className="block p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{sess.title || "Untitled Session"}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(sess.createdAt).toLocaleDateString()} •{" "}
                        {sess.duration ? formatDuration(sess.duration) : "Processing..."}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {sess.topics.slice(0, 3).map((st) => (
                          <Badge key={st.id} variant="secondary">
                            {st.topic.name}
                          </Badge>
                        ))}
                        {sess.topics.length > 3 && (
                          <Badge variant="outline">+{sess.topics.length - 3}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No sessions yet. Start by recording your first session!</p>
              <UploadAudioButton className="mt-4" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Open Tasks</CardTitle>
            <Link href="/tasks">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
          <CardDescription>Tasks extracted from your sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {openTasks.length > 0 ? (
            <div className="space-y-3">
              {openTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <p className="text-sm">{task.description}</p>
                    {task.audioSession && (
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {task.audioSession.title || "Untitled"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              No open tasks
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Topics */}
      {topTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trending Topics This Week</CardTitle>
            <CardDescription>Most discussed topics in your sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topTopics.map((topic) => (
                <Link key={topic.id} href={`/topics/${topic.slug}`}>
                  <Badge variant="outline" className="text-sm py-2 px-3">
                    {topic.name} ({topic._count.audioSessions})
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
