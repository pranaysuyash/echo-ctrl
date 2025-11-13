import OpenAI from "openai";
import { env } from "@/lib/env";
import { storageService } from "./storage";
import FormData from "form-data";

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface TranscriptionResult {
  rawText: string;
  cleanedText: string;
  language: string;
  segments: TranscriptSegment[];
}

export class TranscriptionService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || env.OPENAI_API_KEY,
    });
  }

  async transcribe(audioUrl: string, language: string = "en"): Promise<TranscriptionResult> {
    try {
      // Get audio file buffer
      const audioBuffer = await storageService.getAudioStream(audioUrl);

      // Create a File-like object from buffer
      const audioFile = new File([audioBuffer], "audio.mp3", { type: "audio/mpeg" });

      // Call Whisper API with verbose_json for segments
      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: language,
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      });

      const rawText = response.text;
      const cleanedText = this.cleanTranscript(rawText);

      // Extract segments with timestamps
      const segments: TranscriptSegment[] = [];
      if ("segments" in response && Array.isArray(response.segments)) {
        for (const seg of response.segments) {
          segments.push({
            startTime: seg.start,
            endTime: seg.end,
            text: seg.text.trim(),
          });
        }
      }

      return {
        rawText,
        cleanedText,
        language: response.language || language,
        segments,
      };
    } catch (error) {
      console.error("Transcription error:", error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private cleanTranscript(text: string): string {
    // Basic cleaning: remove excessive whitespace, fix common transcription artifacts
    return text
      .replace(/\s+/g, " ")
      .replace(/\s+([.,!?;:])/g, "$1")
      .trim();
  }
}

export const transcriptionService = new TranscriptionService();
