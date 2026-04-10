/**
 * Job queue powered by BullMQ + Redis.
 * Handles enqueuing and processing of agent jobs.
 */

import { Queue, Worker, type Job as BullJob } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import type { NewJob } from "@crewline/shared";
import { AGENT_PRIORITY, DEFAULT_PRIORITY } from "@crewline/shared";

export const QUEUE_NAME = "crewline-jobs";

export interface QueueJobData {
  agentName: string;
  payload: string;
  repository: string;
  targetNumber: number;
  targetTitle: string | null;
}

export type JobProcessor = (data: QueueJobData) => Promise<{ exitCode: number; result: string }>;

export function createJobQueue(connection: ConnectionOptions) {
  const queue = new Queue<QueueJobData>(QUEUE_NAME, { connection });

  return {
    async enqueue(newJob: NewJob): Promise<string> {
      const priority = AGENT_PRIORITY[newJob.agentName] ?? DEFAULT_PRIORITY;
      const job = await queue.add(newJob.agentName, {
        agentName: newJob.agentName,
        payload: newJob.payload,
        repository: newJob.repository,
        targetNumber: newJob.targetNumber,
        targetTitle: newJob.targetTitle,
      }, { priority });
      return job.id!;
    },

    /**
     * Returns the set of job keys currently waiting or active in the queue.
     * Each key is formatted as `agentName:repository:targetNumber`.
     * Used for deduplication during recovery.
     */
    async getActiveJobKeys(): Promise<Set<string>> {
      const jobs = await queue.getJobs(["waiting", "active", "prioritized"]);
      const keys = new Set<string>();
      for (const job of jobs) {
        keys.add(`${job.data.agentName}:${job.data.repository}:${String(job.data.targetNumber)}`);
      }
      return keys;
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
      lockDuration: 600_000, // 10 minutes — agents can run for a while
      lockRenewTime: 300_000, // Renew lock every 5 minutes
    },
  );

  return worker;
}
