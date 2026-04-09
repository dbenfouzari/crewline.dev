import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { JobHistory } from "./job-history.js";
import type { Job } from "@crewline/shared";

describe("JobHistory", () => {
  let history: JobHistory;

  beforeEach(() => {
    history = new JobHistory(":memory:");
  });

  afterEach(() => {
    history.close();
  });

  function makeJob(overrides: Partial<Job> = {}): Job {
    return {
      id: crypto.randomUUID(),
      agentName: "dev",
      status: "completed",
      payload: '{"action":"labeled"}',
      repository: "user/repo",
      targetNumber: 1,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      result: "PR #42 created",
      exitCode: 0,
      ...overrides,
    };
  }

  it("records and retrieves a job by ID", () => {
    const job = makeJob();
    history.record(job);

    const retrieved = history.getById(job.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(job.id);
    expect(retrieved!.agentName).toBe("dev");
    expect(retrieved!.status).toBe("completed");
    expect(retrieved!.result).toBe("PR #42 created");
  });

  it("updates a job on re-record (upsert)", () => {
    const job = makeJob({ status: "running", result: null, completedAt: null });
    history.record(job);

    const completed = { ...job, status: "completed" as const, result: "Done", completedAt: new Date().toISOString() };
    history.record(completed);

    const retrieved = history.getById(job.id);
    expect(retrieved!.status).toBe("completed");
    expect(retrieved!.result).toBe("Done");
  });

  it("lists jobs by status", () => {
    history.record(makeJob({ status: "completed" }));
    history.record(makeJob({ status: "completed" }));
    history.record(makeJob({ status: "failed", exitCode: 1 }));

    expect(history.listByStatus("completed")).toHaveLength(2);
    expect(history.listByStatus("failed")).toHaveLength(1);
    expect(history.listByStatus("running")).toHaveLength(0);
  });

  it("lists recent jobs with limit", () => {
    for (let i = 0; i < 5; i++) {
      history.record(makeJob());
    }

    expect(history.listRecent(3)).toHaveLength(3);
    expect(history.listRecent()).toHaveLength(5);
  });

  it("returns null for unknown job ID", () => {
    expect(history.getById("nonexistent")).toBeNull();
  });
});
