import { describe, it, expect, beforeEach } from "bun:test";
import { get } from "svelte/store";
import type { JobLifecycleEvent, JobSummary } from "@crewline/shared";
import { jobStore, applyEvent } from "./jobs.js";

function createMockJob(overrides: Partial<JobSummary> = {}): JobSummary {
  return {
    id: "job-1",
    agentName: "requirementsGatherer",
    status: "pending",
    repository: "owner/repo",
    targetNumber: 7,
    targetTitle: null,
    createdAt: "2026-04-10T12:00:00Z",
    startedAt: null,
    completedAt: null,
    result: null,
    exitCode: null,
    ...overrides,
  };
}

describe("jobStore", () => {
  beforeEach(() => {
    jobStore.set([]);
  });

  it("starts with an empty array", () => {
    expect(get(jobStore)).toEqual([]);
  });

  it("can be set with job data", () => {
    const jobs = [createMockJob()];
    jobStore.set(jobs);
    expect(get(jobStore)).toEqual(jobs);
  });
});

describe("applyEvent", () => {
  beforeEach(() => {
    jobStore.set([]);
  });

  it("appends a new job when it does not exist in the store", () => {
    const event: JobLifecycleEvent = {
      type: "job:enqueued",
      job: createMockJob({ id: "job-new" }),
    };

    applyEvent(event);

    const jobs = get(jobStore);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe("job-new");
  });

  it("updates an existing job by ID", () => {
    jobStore.set([createMockJob({ id: "job-1", status: "pending" })]);

    const event: JobLifecycleEvent = {
      type: "job:started",
      job: createMockJob({
        id: "job-1",
        status: "running",
        startedAt: "2026-04-10T12:01:00Z",
      }),
    };

    applyEvent(event);

    const jobs = get(jobStore);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.status).toBe("running");
    expect(jobs[0]?.startedAt).toBe("2026-04-10T12:01:00Z");
  });

  it("preserves other jobs when updating one", () => {
    jobStore.set([
      createMockJob({ id: "job-1" }),
      createMockJob({ id: "job-2", agentName: "architect" }),
    ]);

    const event: JobLifecycleEvent = {
      type: "job:completed",
      job: createMockJob({ id: "job-1", status: "completed" }),
    };

    applyEvent(event);

    const jobs = get(jobStore);
    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.status).toBe("completed");
    expect(jobs[1]?.id).toBe("job-2");
  });
});
