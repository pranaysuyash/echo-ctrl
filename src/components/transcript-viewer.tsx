"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  currentTime?: number;
  onSeek?: (time: number) => void;
}

export function TranscriptViewer({
  segments,
  currentTime = 0,
  onSeek,
}: TranscriptViewerProps) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isCurrentSegment = (segment: TranscriptSegment) => {
    return currentTime >= segment.startTime && currentTime <= segment.endTime;
  };

  return (
    <div className="bg-white border rounded-lg divide-y max-h-[600px] overflow-y-auto">
      {segments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <p>No transcript available</p>
        </div>
      ) : (
        segments.map((segment, index) => (
          <div
            key={index}
            className={cn(
              "p-4 transition-colors cursor-pointer",
              isCurrentSegment(segment) && "bg-primary/10",
              hoveredSegment === index && "bg-accent"
            )}
            onMouseEnter={() => setHoveredSegment(index)}
            onMouseLeave={() => setHoveredSegment(null)}
            onClick={() => onSeek?.(segment.startTime)}
          >
            <div className="flex gap-4">
              <div className="flex-shrink-0 text-xs text-muted-foreground font-mono w-12">
                {formatTime(segment.startTime)}
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed">{segment.text}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
