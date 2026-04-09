/**
 * Job queue powered by BullMQ + Redis.
 * Handles enqueuing and processing of agent jobs.
 */

import { Queue, Worker, type Job as BullJob } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import type { NewJob } from "@crewline/shared";

export const QUEUE_NAME = "crewline-jobs";

export interface QueueJobData {
  agentName: string;
  payload: string;
  repository: string;
  targetNumber: number;
}

export type JobProcessor = (data: QueueJobData) => Promise<{ exitCode: number; result: string }>;

export function createJobQueue(connection: ConnectionOptions) {
  const queue = new Queue<QueueJobData>(QUEUE_NAME, { connection });

  return {
    async enqueue(newJob: NewJob): Promise<string> {
      const job = await queue.add(newJob.agentName, {
        agentName: newJob.agentName,
        payload: newJob.payload,
        repository: newJob.repository,
        targetNumber: newJob.targetNumber,
      });
      return job.id!;
    },

    async close() {
      await queue.close();
    },

    /** Expose underlying queue for advanced usage */
    get raw() {
      return queue;
    },
  };
}

export function createJobWorker(
  connection: ConnectionOptions,
  processor: JobProcessor,
  options?: { concurrency?: number },
) {
  const worker = new Worker<QueueJobData>(
    QUEUE_NAME,
    async (job: BullJob<QueueJobData>) => {
      return processor(job.data);
    },
    {
      connection,
      concurrency: options?.concurrency ?? 1,
    },
  );

  return worker;
}
