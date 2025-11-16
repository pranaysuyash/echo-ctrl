"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Calendar, Clock, Tag, CheckSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";

export default function InsightsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: dailySummary, isLoading: isDailyLoading } = useQuery({
    queryKey: ["daily-summary", selectedDate.toISOString().split("T")[0]],
    queryFn: async () => {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const response = await fetch(`/api/summaries/daily?date=${dateStr}`);
      if (!response.ok) throw new Error("Failed to fetch daily summary");
      const data = await response.json();
      return data.summary;
    },
  });

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          Insights & Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your thinking patterns and productivity
        </p>
      </div>

      {/* Date Navigator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-center">
              <div className="text-2xl font-bold">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              {!isToday && (
                <Button variant="ghost" size="sm" onClick={goToToday} className="mt-2">
                  Go to Today
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextDay}
              disabled={isToday}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      {isDailyLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : dailySummary ? (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dailySummary.sessionCount}</div>
                <p className="text-xs text-muted-foreground">
                  Recorded today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(dailySummary.totalDuration)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Topics</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dailySummary.topTopics.length}</div>
                <p className="text-xs text-muted-foreground">
                  Discussed today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dailySummary.taskCount}</div>
                <p className="text-xs text-muted-foreground">
                  Extracted today
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          {dailySummary.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{dailySummary.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Top Topics */}
          {dailySummary.topTopics && dailySummary.topTopics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Topics</CardTitle>
                <CardDescription>Most discussed topics today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {dailySummary.topTopics.map((topic: string) => (
                    <Link key={topic} href={`/topics/${topic}`}>
                      <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                        {topic}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {dailySummary.sessionCount === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sessions recorded on this day</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Weekly Overview - Coming Soon */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
          <CardDescription>7-day trends and patterns</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Coming soon: Weekly analytics, trends, and insights</p>
        </CardContent>
      </Card>
    </div>
  );
}
