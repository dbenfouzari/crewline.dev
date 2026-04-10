/**
 * API client for the Crewline server dashboard endpoints.
 * All requests go through the Vite dev proxy (/api → server).
 */

import type { JobStatus, JobSummary, PipelineState } from "@crewline/shared";

/**
 * Fetches job summaries from the server, optionally filtered by status.
 *
 * @param status - Optional job status filter
 * @returns Array of job summaries
 */
export async function fetchJobs(status?: JobStatus): Promise<JobSummary[]> {
  const url = status ? `/api/jobs?status=${status}` : "/api/jobs";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.status}`);
  }
  const data: unknown = await response.json();
  return data as JobSummary[];
}

/**
 * Fetches the pipeline state for a specific issue.
 *
 * @param issueNumber - The GitHub issue or PR number
 * @returns The pipeline state with stage snapshots
 */
export async function fetchPipeline(
  issueNumber: number,
): Promise<PipelineState> {
  const response = await fetch(`/api/pipeline/${issueNumber}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch pipeline: ${response.status}`);
  }
  const data: unknown = await response.json();
  return data as PipelineState;
}

/**
 * Creates an EventSource connection to the SSE events endpoint.
 *
 * @returns A native EventSource instance connected to /api/events
 */
export function createEventSource(): EventSource {
  return new EventSource("/api/events");
}
