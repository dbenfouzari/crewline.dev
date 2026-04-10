/**
 * Derived store that computes pipeline state from the job store.
 * Groups jobs by targetNumber and aggregates into PipelineState using
 * the shared domain function.
 */

import { derived } from "svelte/store";
import type { Job, PipelineState } from "@crewline/shared";
import { aggregatePipelineState } from "@crewline/shared";
import { jobStore } from "./jobs.js";

/**
 * Derived store mapping issue numbers to their pipeline state.
 * Recomputes automatically when the jobStore changes.
 *
 * Uses aggregatePipelineState from @crewline/shared for consistency
 * with the server-side pipeline endpoint.
 */
export const pipelinesByIssue = derived(jobStore, ($jobs) => {
  const grouped = new Map<number, Job[]>();

  for (const job of $jobs) {
    const existing = grouped.get(job.targetNumber);
    if (existing) {
      existing.push(job as Job);
    } else {
      grouped.set(job.targetNumber, [job as Job]);
    }
  }

  const pipelines = new Map<number, PipelineState>();
  for (const [issueNumber, jobs] of grouped) {
    pipelines.set(issueNumber, aggregatePipelineState(issueNumber, jobs));
  }

  return pipelines;
});
