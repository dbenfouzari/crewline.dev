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
      issueNumber: null,
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

  it("lists all jobs ordered by createdAt descending", () => {
    const older = makeJob({ createdAt: "2025-01-01T00:00:00Z", status: "completed" });
    const newer = makeJob({ createdAt: "2025-01-02T00:00:00Z", status: "failed" });
    history.record(older);
    history.record(newer);

    const all = history.listAll();
    expect(all).toHaveLength(2);
    expect(all[0]!.id).toBe(newer.id);
    expect(all[1]!.id).toBe(older.id);
  });

  it("lists jobs filtered by target number", () => {
    history.record(makeJob({ targetNumber: 42 }));
    history.record(makeJob({ targetNumber: 42 }));
    history.record(makeJob({ targetNumber: 99 }));

    const jobs = history.listByTargetNumber(42);
    expect(jobs).toHaveLength(2);
    expect(jobs.every((j) => j.targetNumber === 42)).toBe(true);
  });

  it("returns empty array when no jobs match target number", () => {
    history.record(makeJob({ targetNumber: 1 }));

    expect(history.listByTargetNumber(999)).toHaveLength(0);
  });

  it("records and retrieves issueNumber", () => {
    const job = makeJob({ targetNumber: 50, issueNumber: 42 });
    history.record(job);

    const retrieved = history.getById(job.id);
    expect(retrieved!.issueNumber).toBe(42);
  });

  it("stores null issueNumber for issue-triggered jobs", () => {
    const job = makeJob({ targetNumber: 42, issueNumber: null });
    history.record(job);

    const retrieved = history.getById(job.id);
    expect(retrieved!.issueNumber).toBeNull();
  });

  describe("listByIssueNumber", () => {
    it("returns issue-triggered jobs where targetNumber matches", () => {
      history.record(makeJob({ agentName: "requirementsGatherer", targetNumber: 42, issueNumber: null }));
      history.record(makeJob({ agentName: "architect", targetNumber: 42, issueNumber: null }));
      history.record(makeJob({ targetNumber: 99, issueNumber: null }));

      const jobs = history.listByIssueNumber(42);
      expect(jobs).toHaveLength(2);
      expect(jobs.every((job) => job.targetNumber === 42)).toBe(true);
    });

    it("returns PR-triggered jobs where issueNumber matches", () => {
      history.record(makeJob({ agentName: "testMaster", targetNumber: 50, issueNumber: 42 }));
      history.record(makeJob({ agentName: "techLead", targetNumber: 50, issueNumber: 42 }));

      const jobs = history.listByIssueNumber(42);
      expect(jobs).toHaveLength(2);
      expect(jobs.every((job) => job.issueNumber === 42)).toBe(true);
    });

    it("returns both issue-triggered and PR-triggered jobs together", () => {
      history.record(makeJob({ agentName: "requirementsGatherer", targetNumber: 42, issueNumber: null }));
      history.record(makeJob({ agentName: "dev", targetNumber: 42, issueNumber: null }));
      history.record(makeJob({ agentName: "testMaster", targetNumber: 50, issueNumber: 42 }));
      history.record(makeJob({ agentName: "techLead", targetNumber: 50, issueNumber: 42 }));

      const jobs = history.listByIssueNumber(42);
      expect(jobs).toHaveLength(4);
      const agentNames = jobs.map((job) => job.agentName).sort();
      expect(agentNames).toEqual(["dev", "requirementsGatherer", "techLead", "testMaster"]);
    });

    it("returns empty array when no jobs match", () => {
      history.record(makeJob({ targetNumber: 1, issueNumber: null }));

      expect(history.listByIssueNumber(999)).toHaveLength(0);
    });
  });
});
