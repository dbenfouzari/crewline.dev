/**
 * Dashboard types — read-optimized projections for the dashboard API.
 * These types define the contract between the server's dashboard endpoints
 * and future dashboard consumers.
 */

import type { Job, JobStatus } from "./job.js";

/**
 * A read-optimized projection of a Job, omitting the large `payload` field.
 * Used by the `GET /jobs` endpoint and SSE event payloads.
 */
export type JobSummary = Omit<Job, "payload">;

/**
 * Converts a full Job into a JobSummary by stripping the payload.
 *
 * @param job - The full job record
 * @returns A JobSummary without the payload field
 */
export function toJobSummary(job: Job): JobSummary {
  const { payload: _, ...summary } = job;
  return summary;
}

/**
 * The current state of one agent within a pipeline for a specific issue.
 * Captures which agent, its status, and timing information.
 */
export interface PipelineStageSnapshot {
  /** The agent key (e.g., "requirementsGatherer", "architect", "dev") */
  agentName: string;
  /** Current status of this agent's most recent job for the issue */
  status: JobStatus;
  /** Job ID of the most recent job for this agent */
  jobId: string;
  /** When the job was created */
  createdAt: string;
  /** When the job started running */
  startedAt: string | null;
  /** When the job completed or failed */
  completedAt: string | null;
}

/**
 * The complete pipeline view for an issue: all stage snapshots
 * aggregated from job history.
 */
export interface PipelineState {
  /** The issue or PR number */
  issueNumber: number;
  /** Snapshots for each agent that has jobs for this issue */
  stages: PipelineStageSnapshot[];
}

/**
 * SSE event types for real-time job lifecycle notifications.
 * Maps from BullMQ QueueEvents to domain-meaningful names.
 */
export type JobLifecycleEventType =
  | "job:enqueued"
  | "job:started"
  | "job:completed"
  | "job:failed";

/**
 * A real-time notification of a job transitioning between statuses.
 * Sent as the SSE event payload.
 */
export interface JobLifecycleEvent {
  /** The lifecycle event type */
  type: JobLifecycleEventType;
  /** Summary of the job that triggered this event */
  job: JobSummary;
}

/**
 * Aggregates raw job data into a pipeline state for a given issue.
 * Picks the most recent job per agent (by createdAt descending) to handle retries.
 *
 * @param issueNumber - The issue or PR number
 * @param jobs - All jobs for this issue from job history
 * @returns The pipeline state with one snapshot per agent
 */
export function aggregatePipelineState(
  issueNumber: number,
  jobs: Job[],
): PipelineState {
  const latestByAgent = new Map<string, Job>();

  for (const job of jobs) {
    const existing = latestByAgent.get(job.agentName);
    if (!existing || job.createdAt > existing.createdAt) {
      latestByAgent.set(job.agentName, job);
    }
  }

  const stages: PipelineStageSnapshot[] = Array.from(
    latestByAgent.values(),
  ).map((job) => ({
    agentName: job.agentName,
    status: job.status,
    jobId: job.id,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  }));

  return { issueNumber, stages };
}
