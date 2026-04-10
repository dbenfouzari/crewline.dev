import { describe, it, expect, beforeEach } from "bun:test";
import { get } from "svelte/store";
import type { JobSummary } from "@crewline/shared";
import { jobStore } from "./jobs.js";
import { pipelinesByIssue } from "./pipelines.js";

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

describe("pipelinesByIssue", () => {
  beforeEach(() => {
    jobStore.set([]);
  });

  it("returns an empty map when job store is empty", () => {
    const pipelines = get(pipelinesByIssue);
    expect(pipelines.size).toBe(0);
  });

  it("groups jobs with the same targetNumber into one pipeline", () => {
    jobStore.set([
      createMockJob({
        id: "job-1",
        agentName: "requirementsGatherer",
        targetNumber: 7,
      }),
      createMockJob({
        id: "job-2",
        agentName: "architect",
        targetNumber: 7,
        createdAt: "2026-04-10T12:05:00Z",
      }),
    ]);

    const pipelines = get(pipelinesByIssue);
    expect(pipelines.size).toBe(1);
    expect(pipelines.has(7)).toBe(true);

    const pipeline = pipelines.get(7)!;
    expect(pipeline.issueNumber).toBe(7);
    expect(pipeline.stages).toHaveLength(2);
  });

  it("creates separate pipelines for different targetNumbers", () => {
    jobStore.set([
      createMockJob({ id: "job-1", targetNumber: 7 }),
      createMockJob({ id: "job-2", targetNumber: 12 }),
      createMockJob({ id: "job-3", targetNumber: 7, agentName: "architect" }),
    ]);

    const pipelines = get(pipelinesByIssue);
    expect(pipelines.size).toBe(2);
    expect(pipelines.has(7)).toBe(true);
    expect(pipelines.has(12)).toBe(true);

    expect(pipelines.get(7)!.stages).toHaveLength(2);
    expect(pipelines.get(12)!.stages).toHaveLength(1);
  });

  it("reacts to jobStore updates", () => {
    jobStore.set([createMockJob({ id: "job-1", targetNumber: 7 })]);
    expect(get(pipelinesByIssue).size).toBe(1);

    jobStore.set([
      createMockJob({ id: "job-1", targetNumber: 7 }),
      createMockJob({ id: "job-2", targetNumber: 15 }),
    ]);
    expect(get(pipelinesByIssue).size).toBe(2);
  });

  it("uses aggregatePipelineState to deduplicate retries per agent", () => {
    jobStore.set([
      createMockJob({
        id: "job-1",
        agentName: "dev",
        targetNumber: 7,
        status: "failed",
        createdAt: "2026-04-10T12:00:00Z",
      }),
      createMockJob({
        id: "job-2",
        agentName: "dev",
        targetNumber: 7,
        status: "running",
        createdAt: "2026-04-10T13:00:00Z",
      }),
    ]);

    const pipelines = get(pipelinesByIssue);
    const pipeline = pipelines.get(7)!;

    // aggregatePipelineState picks the most recent job per agent
    expect(pipeline.stages).toHaveLength(1);
    expect(pipeline.stages[0]?.status).toBe("running");
    expect(pipeline.stages[0]?.jobId).toBe("job-2");
  });

  it("returns empty map after clearing jobStore", () => {
    jobStore.set([createMockJob({ id: "job-1", targetNumber: 7 })]);
    expect(get(pipelinesByIssue).size).toBe(1);

    jobStore.set([]);
    expect(get(pipelinesByIssue).size).toBe(0);
  });
});
