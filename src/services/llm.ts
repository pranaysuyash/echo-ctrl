import OpenAI from "openai";
import { env } from "@/lib/env";

export interface ChunkData {
  chunkIndex: number;
  title: string;
  summary: string;
  content: string;
  startTime?: number;
  endTime?: number;
}

export interface ExtractedTask {
  description: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
}

export interface ExtractedTopic {
  name: string;
  relevance: number;
}

export interface StructuredData {
  chunks: ChunkData[];
  topics: ExtractedTopic[];
  tasks: ExtractedTask[];
}

export interface SessionNoteData {
  title: string;
  content: string;
}

export class LLMService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || env.OPENAI_API_KEY,
    });
  }

  async structureTranscript(
    transcript: string,
    segments: Array<{ startTime: number; endTime: number; text: string }>
  ): Promise<StructuredData> {
    const prompt = `You are an AI assistant that structures voice transcripts into organized chunks, topics, and tasks.

Given the following transcript, please:
1. Split it into logical chunks (sections of related content)
2. For each chunk, provide a title and summary
3. Extract all relevant topics discussed
4. Extract actionable tasks mentioned

Transcript:
${transcript}

Return your response as a JSON object with this structure:
{
  "chunks": [
    {
      "chunkIndex": 0,
      "title": "Chunk title",
      "summary": "Brief summary",
      "content": "The actual text content of this chunk"
    }
  ],
  "topics": [
    {
      "name": "topic-name",
      "relevance": 0.9
    }
  ],
  "tasks": [
    {
      "description": "Task description",
      "priority": "medium"
    }
  ]
}

Make sure topics are lowercase, hyphenated slugs. Relevance is 0-1.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI that structures voice transcripts. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from LLM");
      }

      const structured = JSON.parse(content) as StructuredData;

      // Map timestamps to chunks if possible
      if (segments.length > 0 && structured.chunks.length > 0) {
        structured.chunks = this.mapTimestampsToChunks(structured.chunks, segments, transcript);
      }

      return structured;
    } catch (error) {
      console.error("LLM structuring error:", error);
      throw new Error(`Failed to structure transcript: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async generateSessionNote(
    transcript: string,
    chunks: ChunkData[],
    topics: string[],
    tasks: ExtractedTask[],
    verbosity: "concise" | "normal" | "detailed" = "normal"
  ): Promise<SessionNoteData> {
    const verbosityInstructions = {
      concise: "Keep it brief and to the point. 2-3 paragraphs maximum.",
      normal: "Provide a balanced summary with key points and insights. 4-6 paragraphs.",
      detailed: "Provide comprehensive notes with all important details, examples, and context. 8-12 paragraphs.",
    };

    const prompt = `You are an AI assistant that generates structured markdown notes from voice transcripts.

Given the following information, create a well-formatted markdown note:

Topics: ${topics.join(", ")}
Number of chunks: ${chunks.length}
Tasks identified: ${tasks.length}

Chunks:
${chunks.map((c) => `## ${c.title}\n${c.summary}`).join("\n\n")}

${verbosityInstructions[verbosity]}

Create a markdown note with:
1. A descriptive title (not "Session Note" - make it specific to the content)
2. Brief overview
3. Main sections covering the key chunks
4. List of tasks at the end if any

Return your response as JSON:
{
  "title": "Descriptive title",
  "content": "Full markdown content"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI that creates structured markdown notes. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from LLM");
      }

      return JSON.parse(content) as SessionNoteData;
    } catch (error) {
      console.error("Note generation error:", error);
      throw new Error(`Failed to generate session note: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async answerQuery(query: string, context: string[]): Promise<string> {
    const contextText = context.join("\n\n---\n\n");

    const prompt = `You are EchoCtrl, an AI assistant that helps users understand and recall their recorded thoughts.

The user has asked: "${query}"

Here is relevant context from their previous sessions:
${contextText}

Provide a clear, concise answer to their question based on the context provided. If the context doesn't contain enough information, say so.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are EchoCtrl, a helpful AI assistant for personal knowledge management.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || "I couldn't generate an answer.";
    } catch (error) {
      console.error("Query answering error:", error);
      throw new Error(`Failed to answer query: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private mapTimestampsToChunks(
    chunks: ChunkData[],
    segments: Array<{ startTime: number; endTime: number; text: string }>,
    fullTranscript: string
  ): ChunkData[] {
    // Simple heuristic: map chunks to segments based on content matching
    return chunks.map((chunk, index) => {
      const chunkWords = chunk.content.split(/\s+/).slice(0, 10).join(" ");

      // Find the segment that best matches the start of this chunk
      let bestMatch = null;
      let bestScore = 0;

      for (const segment of segments) {
        const segmentWords = segment.text.split(/\s+/).slice(0, 10).join(" ");
        if (chunkWords.includes(segmentWords) || segmentWords.includes(chunkWords)) {
          const score = Math.min(chunkWords.length, segmentWords.length);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = segment;
          }
        }
      }

      if (bestMatch) {
        return {
          ...chunk,
          startTime: bestMatch.startTime,
          endTime: bestMatch.endTime,
        };
      }

      return chunk;
    });
  }
}

export const llmService = new LLMService();
