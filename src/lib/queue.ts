import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export interface ProcessAudioJobData {
  sessionId: string;
  userId: string;
}

export const audioProcessingQueue = new Queue<ProcessAudioJobData>("audio-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // keep for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep for 7 days
    },
  },
});

export interface DailySummaryJobData {
  userId: string;
  date: string;
}

export const dailySummaryQueue = new Queue<DailySummaryJobData>("daily-summary", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
  },
});

export interface WeeklySummaryJobData {
  userId: string;
  weekStart: string;
}

export const weeklySummaryQueue = new Queue<WeeklySummaryJobData>("weekly-summary", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
  },
});

export async function addAudioProcessingJob(data: ProcessAudioJobData) {
  return audioProcessingQueue.add("process-audio", data);
}

export async function addDailySummaryJob(data: DailySummaryJobData) {
  return dailySummaryQueue.add("generate-daily-summary", data);
}

export async function addWeeklySummaryJob(data: WeeklySummaryJobData) {
  return weeklySummaryQueue.add("generate-weekly-summary", data);
}
