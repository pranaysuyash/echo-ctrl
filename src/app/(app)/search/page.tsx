"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, FileText, CheckSquare, ArrowRight } from "lucide-react";

interface SearchSession {
  id: string;
  title: string;
  createdAt: string;
  topics: string[];
  notePreview: string;
  matchType: "text" | "semantic";
  similarity?: number;
}

interface SearchTask {
  id: string;
  description: string;
  status: string;
  sessionId?: string;
  sessionTitle?: string;
  matchType: "text" | "semantic";
}

interface SearchResults {
  sessions: SearchSession[];
  tasks: SearchTask[];
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [searchMode, setSearchMode] = useState<"both" | "text" | "semantic">("both");

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", query, searchMode],
    queryFn: async () => {
      if (!query) return { sessions: [], tasks: [] };

      const params = new URLSearchParams({ q: query, mode: searchMode });
      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) throw new Error("Failed to search");
      return response.json() as Promise<SearchResults>;
    },
    enabled: !!query,
  });

  if (!query) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">No search query</h2>
            <p className="text-muted-foreground">
              Use the search bar above to search your sessions
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Search Results</h1>
        <p className="text-muted-foreground mt-1">
          Results for: <span className="font-medium">&quot;{query}&quot;</span>
        </p>
      </div>

      {/* Search Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={searchMode === "both" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchMode("both")}
        >
          All Results
        </Button>
        <Button
          variant={searchMode === "text" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchMode("text")}
        >
          Text Search
        </Button>
        <Button
          variant={searchMode === "semantic" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchMode("semantic")}
        >
          Semantic Search
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !results || (results.sessions.length === 0 && results.tasks.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold text-lg mb-2">No results found</h3>
            <p>Try adjusting your search query or using different keywords</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Sessions */}
          {results.sessions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  Sessions ({results.sessions.length})
                </h2>
              </div>

              <div className="space-y-3">
                {results.sessions.map((session) => (
                  <Link key={session.id} href={`/sessions/${session.id}`}>
                    <Card className="hover:bg-accent transition-colors cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">
                                {session.title || "Untitled Session"}
                              </h3>
                              <Badge variant="secondary" className="text-xs">
                                {session.matchType}
                              </Badge>
                              {session.similarity && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(session.similarity * 100)}% match
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </p>

                            {session.notePreview && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {session.notePreview}
                              </p>
                            )}

                            {session.topics && session.topics.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {session.topics.map((topic) => (
                                  <Badge key={topic} variant="secondary">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {results.tasks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  Tasks ({results.tasks.length})
                </h2>
              </div>

              <div className="space-y-3">
                {results.tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={task.status === "OPEN" ? "default" : "secondary"}
                            >
                              {task.status.toLowerCase()}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {task.matchType}
                            </Badge>
                          </div>

                          <p className="text-sm mb-2">{task.description}</p>

                          {task.sessionId && task.sessionTitle && (
                            <Link
                              href={`/sessions/${task.sessionId}`}
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              From: {task.sessionTitle}
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
