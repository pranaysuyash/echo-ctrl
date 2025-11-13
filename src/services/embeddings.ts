import OpenAI from "openai";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

export class EmbeddingService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || env.OPENAI_API_KEY,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 1536,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Embedding generation error:", error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async generateAndStoreSessionEmbedding(
    sessionId: string,
    content: string
  ): Promise<void> {
    const embedding = await this.generateEmbedding(content);

    await db.embedding.create({
      data: {
        audioSessionId: sessionId,
        embeddingType: "session_note",
        content,
        vector: `[${embedding.join(",")}]` as any,
      },
    });
  }

  async generateAndStoreChunkEmbedding(
    chunkId: string,
    content: string
  ): Promise<void> {
    const embedding = await this.generateEmbedding(content);

    await db.embedding.create({
      data: {
        chunkId,
        embeddingType: "chunk",
        content,
        vector: `[${embedding.join(",")}]` as any,
      },
    });
  }

  async searchSimilar(
    query: string,
    limit: number = 10,
    userId?: string
  ): Promise<Array<{ id: string; content: string; similarity: number; sessionId?: string }>> {
    const queryEmbedding = await this.generateEmbedding(query);

    // Using pgvector for similarity search
    // This requires the vector extension and proper indexing
    const vectorString = `[${queryEmbedding.join(",")}]`;

    // Raw SQL query for vector similarity
    const results = await db.$queryRaw<Array<{
      id: string;
      content: string;
      audio_session_id: string | null;
      similarity: number;
    }>>`
      SELECT
        e.id,
        e.content,
        e.audio_session_id,
        1 - (e.vector <=> ${vectorString}::vector) as similarity
      FROM embeddings e
      ${userId ? db.$queryRaw`INNER JOIN audio_sessions a ON e.audio_session_id = a.id WHERE a.user_id = ${userId}` : db.$queryRaw``}
      ORDER BY e.vector <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      similarity: r.similarity,
      sessionId: r.audio_session_id || undefined,
    }));
  }
}

export const embeddingService = new EmbeddingService();
