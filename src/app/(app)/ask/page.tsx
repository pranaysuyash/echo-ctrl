"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, Sparkles, ExternalLink } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";

interface QueryResponse {
  answer: string;
  references: Array<{
    id: string;
    title: string;
    createdAt: string;
    topics: string[];
    notePreview: string;
  }>;
}

interface Message {
  type: "user" | "assistant";
  content: string;
  references?: QueryResponse["references"];
}

const EXAMPLE_QUERIES = [
  "What did I conclude about pricing last week?",
  "Summarize everything I said about EchoCtrl in the last 7 days",
  "What open tasks did I leave for myself yesterday?",
  "What are the main themes I've been thinking about?",
];

export default function AskEchoCtrlPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const queryMutation = useMutation({
    mutationFn: async (queryText: string) => {
      const response = await fetch("/api/conversation/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText }),
      });
      if (!response.ok) throw new Error("Failed to process query");
      return response.json() as Promise<QueryResponse>;
    },
    onSuccess: (data, queryText) => {
      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          content: data.answer,
          references: data.references,
        },
      ]);
      setQuery("");
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          content: "I'm sorry, I encountered an error processing your query. Please try again.",
        },
      ]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || queryMutation.isPending) return;

    setMessages((prev) => [...prev, { type: "user", content: query }]);
    queryMutation.mutate(query);
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          Ask EchoCtrl
        </h1>
        <p className="text-muted-foreground mt-1">
          Query your knowledge base conversationally
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Start a Conversation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ask questions about your recorded thoughts. EchoCtrl will search through
                your sessions and provide relevant answers.
              </p>

              <div className="space-y-2">
                <p className="text-sm font-medium">Example queries:</p>
                <div className="grid gap-2">
                  {EXAMPLE_QUERIES.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className="text-left p-3 rounded-lg border hover:bg-accent transition-colors text-sm"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 mb-6">
          {messages.map((message, index) => (
            <div key={index} className="space-y-4">
              {message.type === "user" ? (
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-lg px-4 py-3 max-w-[80%]">
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <MarkdownRenderer content={message.content} />
                  </div>

                  {message.references && message.references.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">
                          Referenced Sessions ({message.references.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {message.references.map((ref) => (
                            <Link
                              key={ref.id}
                              href={`/sessions/${ref.id}`}
                              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">
                                      {ref.title || "Untitled Session"}
                                    </p>
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(ref.createdAt).toLocaleDateString()}
                                  </p>
                                  {ref.notePreview && (
                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                      {ref.notePreview}
                                    </p>
                                  )}
                                  {ref.topics && ref.topics.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {ref.topics.map((topic) => (
                                        <Badge key={topic} variant="outline" className="text-xs">
                                          {topic}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          ))}

          {queryMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t pt-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your sessions..."
            disabled={queryMutation.isPending}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!query.trim() || queryMutation.isPending}
          >
            {queryMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Ask
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
