import { describe, expect, it } from "bun:test";
import type { Job } from "./job.js";
import { toJobSummary, aggregatePipelineState } from "./dashboard.js";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: crypto.randomUUID(),
    agentName: "dev",
    status: "completed",
    payload: '{"action":"labeled"}',
    repository: "user/repo",
    targetNumber: 1,
    issueNumber: null,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    result: "PR #42 created",
    exitCode: 0,
    ...overrides,
  };
}

describe("toJobSummary", () => {
  it("strips the payload field from a job", () => {
    const job = makeJob({ payload: '{"large":"data"}' });
    const summary = toJobSummary(job);

    expect(summary).not.toHaveProperty("payload");
    expect(summary.id).toBe(job.id);
    expect(summary.agentName).toBe(job.agentName);
    expect(summary.status).toBe(job.status);
    expect(summary.repository).toBe(job.repository);
    expect(summary.targetNumber).toBe(job.targetNumber);
    expect(summary.createdAt).toBe(job.createdAt);
    expect(summary.startedAt).toBe(job.startedAt);
    expect(summary.completedAt).toBe(job.completedAt);
    expect(summary.result).toBe(job.result);
    expect(summary.exitCode).toBe(job.exitCode);
  });

  it("preserves null fields in the summary", () => {
    const job = makeJob({ startedAt: null, completedAt: null, result: null, exitCode: null });
    const summary = toJobSummary(job);

    expect(summary.startedAt).toBeNull();
    expect(summary.completedAt).toBeNull();
    expect(summary.result).toBeNull();
    expect(summary.exitCode).toBeNull();
  });
});

describe("aggregatePipelineState", () => {
  it("returns empty stages for an empty jobs array", () => {
    const state = aggregatePipelineState(42, []);

    expect(state.issueNumber).toBe(42);
    expect(state.stages).toHaveLength(0);
  });

  it("returns a single stage for a single job", () => {
    const job = makeJob({ agentName: "architect", targetNumber: 5 });
    const state = aggregatePipelineState(5, [job]);

    expect(state.issueNumber).toBe(5);
    expect(state.stages).toHaveLength(1);
    expect(state.stages[0]!.agentName).toBe("architect");
    expect(state.stages[0]!.status).toBe(job.status);
    expect(state.stages[0]!.jobId).toBe(job.id);
    expect(state.stages[0]!.createdAt).toBe(job.createdAt);
    expect(state.stages[0]!.startedAt).toBe(job.startedAt);
    expect(state.stages[0]!.completedAt).toBe(job.completedAt);
  });

  it("groups multiple agents into separate stages", () => {
    const jobs = [
      makeJob({ agentName: "requirementsGatherer", status: "completed" }),
      makeJob({ agentName: "architect", status: "running", completedAt: null }),
      makeJob({ agentName: "dev", status: "pending", startedAt: null, completedAt: null }),
    ];

    const state = aggregatePipelineState(1, jobs);

    expect(state.stages).toHaveLength(3);
    const agentNames = state.stages.map((s) => s.agentName).sort();
    expect(agentNames).toEqual(["architect", "dev", "requirementsGatherer"]);
  });

  it("picks the most recent job per agent when multiple jobs exist", () => {
    const olderJob = makeJob({
      agentName: "dev",
      status: "failed",
      createdAt: "2025-01-01T00:00:00Z",
      exitCode: 1,
    });
    const newerJob = makeJob({
      agentName: "dev",
      status: "completed",
      createdAt: "2025-01-02T00:00:00Z",
    });

    const state = aggregatePipelineState(10, [olderJob, newerJob]);

    expect(state.stages).toHaveLength(1);
    expect(state.stages[0]!.status).toBe("completed");
    expect(state.stages[0]!.jobId).toBe(newerJob.id);
  });

  it("handles multiple agents each with multiple jobs", () => {
    const jobs = [
      makeJob({ agentName: "architect", status: "failed", createdAt: "2025-01-01T00:00:00Z" }),
      makeJob({ agentName: "architect", status: "completed", createdAt: "2025-01-02T00:00:00Z" }),
      makeJob({ agentName: "dev", status: "failed", createdAt: "2025-01-01T00:00:00Z" }),
      makeJob({ agentName: "dev", status: "running", createdAt: "2025-01-03T00:00:00Z" }),
    ];

    const state = aggregatePipelineState(7, jobs);

    expect(state.stages).toHaveLength(2);

    const architectStage = state.stages.find((s) => s.agentName === "architect");
    expect(architectStage!.status).toBe("completed");

    const devStage = state.stages.find((s) => s.agentName === "dev");
    expect(devStage!.status).toBe("running");
  });

  it("handles jobs with identical createdAt by keeping the last one encountered", () => {
    const timestamp = "2025-06-15T12:00:00Z";
    const firstJob = makeJob({
      agentName: "dev",
      status: "failed",
      createdAt: timestamp,
    });
    const secondJob = makeJob({
      agentName: "dev",
      status: "completed",
      createdAt: timestamp,
    });

    const state = aggregatePipelineState(1, [firstJob, secondJob]);

    expect(state.stages).toHaveLength(1);
    // With identical timestamps, the later entry in the array does NOT replace (strictly greater check)
    expect(state.stages[0]!.jobId).toBe(firstJob.id);
  });

  it("does not include the payload in stage snapshots", () => {
    const job = makeJob({ payload: '{"large":"webhook_data"}' });
    const state = aggregatePipelineState(1, [job]);

    expect(state.stages[0]).not.toHaveProperty("payload");
  });
});
