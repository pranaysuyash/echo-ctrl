"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag, FileText, CheckSquare } from "lucide-react";

interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sessionCount: number;
  taskCount: number;
}

export default function TopicsPage() {
  const { data: topics, isLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const response = await fetch("/api/topics");
      if (!response.ok) throw new Error("Failed to fetch topics");
      const data = await response.json();
      return data.topics as Topic[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Topics</h1>
        <p className="text-muted-foreground mt-1">
          Explore themes and subjects across your sessions
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !topics || topics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No topics yet</p>
            <p className="text-sm mt-2">Topics will appear as you record more sessions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link key={topic.id} href={`/topics/${topic.slug}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        {topic.name}
                      </CardTitle>
                      {topic.description && (
                        <CardDescription className="mt-2 line-clamp-2">
                          {topic.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{topic.sessionCount} sessions</span>
                    </div>
                    {topic.taskCount > 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CheckSquare className="h-4 w-4" />
                        <span>{topic.taskCount} tasks</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
