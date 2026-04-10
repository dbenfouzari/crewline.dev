/**
 * Job types for the work queue.
 * A job represents a single agent invocation.
 */

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface Job {
  id: string;
  /** Which agent config this job uses */
  agentName: string;
  /** Current status */
  status: JobStatus;
  /** GitHub event payload that triggered this job */
  payload: string;
  /** Repository full name (owner/repo) */
  repository: string;
  /** Issue or PR number */
  targetNumber: number;
  /** Human-readable title of the target issue or PR, extracted at enqueue time */
  targetTitle: string | null;
  /** Timestamps */
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  /** Agent output / error message */
  result: string | null;
  /** Exit code from Claude CLI */
  exitCode: number | null;
}

export type NewJob = Pick<
  Job,
  "agentName" | "payload" | "repository" | "targetNumber" | "targetTitle"
>;
