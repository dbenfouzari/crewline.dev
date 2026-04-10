/**
 * Svelte store for job data — the single source of truth for job state.
 */

import { writable } from "svelte/store";
import type { JobLifecycleEvent, JobSummary } from "@crewline/shared";
import { fetchJobs } from "../api.js";

/**
 * Writable store holding all job summaries fetched from the server.
 */
export const jobStore = writable<JobSummary[]>([]);

/**
 * Loads all jobs from the server and populates the store.
 */
export async function loadJobs(): Promise<void> {
  const jobs = await fetchJobs();
  jobStore.set(jobs);
}

/**
 * Applies a real-time SSE event to the job store.
 * Upserts the job in the array by ID — replaces if exists, appends if new.
 *
 * @param event - The job lifecycle event from SSE
 */
export function applyEvent(event: JobLifecycleEvent): void {
  jobStore.update((jobs) => {
    const index = jobs.findIndex((job) => job.id === event.job.id);
    if (index >= 0) {
      const updated = [...jobs];
      updated[index] = event.job;
      return updated;
    }
    return [...jobs, event.job];
  });
}
