/**
 * API client for the Crewline server dashboard endpoints.
 * All requests go through the Vite dev proxy (/api → server).
 */

import type { JobStatus, JobSummary, PipelineState } from "@crewline/shared";
import { z } from "zod";

/**
 * Zod schema for validating JobSummary responses at the API boundary.
 */
const JobSummarySchema = z.object({
  id: z.string(),
  agentName: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  repository: z.string(),
  targetNumber: z.number(),
  targetTitle: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  result: z.string().nullable(),
  exitCode: z.number().nullable(),
});

/**
 * Zod schema for validating PipelineStageSnapshot responses.
 */
const PipelineStageSnapshotSchema = z.object({
  agentName: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  jobId: z.string(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

/**
 * Zod schema for validating PipelineState responses at the API boundary.
 */
const PipelineStateSchema = z.object({
  issueNumber: z.number(),
  title: z.string().nullable(),
  stages: z.array(PipelineStageSnapshotSchema),
});

/**
 * Fetches job summaries from the server, optionally filtered by status.
 *
 * @param status - Optional job status filter
 * @returns Array of job summaries validated with Zod
 */
export async function fetchJobs(status?: JobStatus): Promise<JobSummary[]> {
  const url = status ? `/api/jobs?status=${status}` : "/api/jobs";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.status}`);
  }
  const data: unknown = await response.json();
  const envelope = z.object({ jobs: z.array(JobSummarySchema) }).parse(data);
  return envelope.jobs;
}

/**
 * Fetches the pipeline state for a specific issue.
 *
 * @param issueNumber - The GitHub issue or PR number
 * @returns The pipeline state with stage snapshots, validated with Zod
 */
export async function fetchPipeline(
  issueNumber: number,
): Promise<PipelineState> {
  const response = await fetch(`/api/pipeline/${issueNumber}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch pipeline: ${response.status}`);
  }
  const data: unknown = await response.json();
  return PipelineStateSchema.parse(data);
}

/**
 * Creates an EventSource connection to the SSE events endpoint.
 *
 * @returns A native EventSource instance connected to /api/events
 */
export function createEventSource(): EventSource {
  return new EventSource("/api/events");
}
