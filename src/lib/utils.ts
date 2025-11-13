import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractTimeRange(query: string): {
  dateFrom?: Date;
  dateTo?: Date;
  queryWithoutTime: string;
} {
  const now = new Date();
  const patterns = [
    { regex: /\b(yesterday|last night)\b/i, days: 1 },
    { regex: /\blast (\d+) days?\b/i, days: "match" },
    { regex: /\bthis week\b/i, days: 7 },
    { regex: /\blast week\b/i, days: 14, offset: 7 },
    { regex: /\blast (\d+) weeks?\b/i, days: "matchWeeks" },
    { regex: /\btoday\b/i, days: 0 },
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern.regex);
    if (match) {
      let days = 0;
      if (pattern.days === "match") {
        days = parseInt(match[1], 10);
      } else if (pattern.days === "matchWeeks") {
        days = parseInt(match[1], 10) * 7;
      } else {
        days = pattern.days;
      }

      const dateFrom = new Date(now);
      dateFrom.setDate(dateFrom.getDate() - days - (pattern.offset || 0));
      dateFrom.setHours(0, 0, 0, 0);

      const dateTo = new Date(now);
      if (pattern.offset) {
        dateTo.setDate(dateTo.getDate() - pattern.offset);
      }
      dateTo.setHours(23, 59, 59, 999);

      const queryWithoutTime = query.replace(pattern.regex, "").trim();
      return { dateFrom, dateTo, queryWithoutTime };
    }
  }

  return { queryWithoutTime: query };
}
