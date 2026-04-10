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

/**
 * Pipeline stage priority: lower number = processed first.
 * Agents later in the pipeline get higher priority so in-progress
 * issues finish before new ones start.
 */
const AGENT_PRIORITY: Record<string, number> = {
  techLead: 1,
  testMaster: 2,
  dev: 3,
  domainExpert: 4,
  architect: 5,
  requirementsGatherer: 6,
};

const DEFAULT_PRIORITY = 10;

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
      }, { priority });
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
      lockDuration: 600_000, // 10 minutes — agents can run for a while
      lockRenewTime: 300_000, // Renew lock every 5 minutes
    },
  );

  return worker;
}
