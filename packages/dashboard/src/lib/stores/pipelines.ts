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
    // Pipeline key: issueNumber ?? targetNumber
    // For issue-stage jobs, issueNumber is null → group by targetNumber (the issue number)
    // For PR-stage jobs, issueNumber is set → group under the linked issue
    // For orphan PRs, issueNumber is null → group by targetNumber (the PR number)
    const pipelineKey = job.issueNumber ?? job.targetNumber;
    const existing = grouped.get(pipelineKey);
    if (existing) {
      existing.push(job as Job);
    } else {
      grouped.set(pipelineKey, [job as Job]);
    }
  }

  const pipelines = new Map<number, PipelineState>();
  for (const [issueNumber, jobs] of grouped) {
    pipelines.set(issueNumber, aggregatePipelineState(issueNumber, jobs));
  }

  return pipelines;
});
