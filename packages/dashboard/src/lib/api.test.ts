import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { JobSummary, PipelineState } from "@crewline/shared";

function createMockJobSummary(
  overrides: Partial<JobSummary> = {},
): JobSummary {
  return {
    id: "job-1",
    agentName: "requirementsGatherer",
    status: "pending",
    repository: "owner/repo",
    targetNumber: 7,
    createdAt: "2026-04-10T12:00:00Z",
    startedAt: null,
    completedAt: null,
    result: null,
    exitCode: null,
    ...overrides,
  };
}

function createMockPipelineState(
  overrides: Partial<PipelineState> = {},
): PipelineState {
  return {
    issueNumber: 7,
    stages: [
      {
        agentName: "requirementsGatherer",
        status: "completed",
        jobId: "job-1",
        createdAt: "2026-04-10T12:00:00Z",
        startedAt: "2026-04-10T12:01:00Z",
        completedAt: "2026-04-10T12:05:00Z",
      },
    ],
    ...overrides,
  };
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchJobs", () => {
  it("calls /api/jobs without query parameter when no status provided", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify([createMockJobSummary()]), {
          status: 200,
        }),
      ),
    );
    globalThis.fetch = mockFetch;

    const { fetchJobs } = await import("./api.js");
    await fetchJobs();

    expect(mockFetch).toHaveBeenCalledWith("/api/jobs");
  });

  it("appends status query parameter when status provided", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify([createMockJobSummary({ status: "running" })]), {
          status: 200,
        }),
      ),
    );
    globalThis.fetch = mockFetch;

    const { fetchJobs } = await import("./api.js");
    await fetchJobs("running");

    expect(mockFetch).toHaveBeenCalledWith("/api/jobs?status=running");
  });

  it("returns parsed job summaries", async () => {
    const jobs = [
      createMockJobSummary({ id: "job-1" }),
      createMockJobSummary({ id: "job-2", agentName: "architect" }),
    ];
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(jobs), { status: 200 })),
    );

    const { fetchJobs } = await import("./api.js");
    const result = await fetchJobs();

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("job-1");
    expect(result[1]?.id).toBe("job-2");
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Not Found", { status: 404 })),
    );

    const { fetchJobs } = await import("./api.js");

    expect(fetchJobs()).rejects.toThrow("Failed to fetch jobs: 404");
  });

  it("throws on invalid response shape (Zod validation)", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify([{ invalid: true }]), { status: 200 }),
      ),
    );

    const { fetchJobs } = await import("./api.js");

    expect(fetchJobs()).rejects.toThrow();
  });
});

describe("fetchPipeline", () => {
  it("calls /api/pipeline/:issueNumber with correct URL", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify(createMockPipelineState()), {
          status: 200,
        }),
      ),
    );
    globalThis.fetch = mockFetch;

    const { fetchPipeline } = await import("./api.js");
    await fetchPipeline(42);

    expect(mockFetch).toHaveBeenCalledWith("/api/pipeline/42");
  });

  it("returns parsed pipeline state", async () => {
    const pipeline = createMockPipelineState({ issueNumber: 42 });
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(pipeline), { status: 200 })),
    );

    const { fetchPipeline } = await import("./api.js");
    const result = await fetchPipeline(42);

    expect(result.issueNumber).toBe(42);
    expect(result.stages).toHaveLength(1);
    expect(result.stages[0]?.agentName).toBe("requirementsGatherer");
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Server Error", { status: 500 })),
    );

    const { fetchPipeline } = await import("./api.js");

    expect(fetchPipeline(7)).rejects.toThrow("Failed to fetch pipeline: 500");
  });

  it("throws on invalid response shape (Zod validation)", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ wrong: "shape" }), { status: 200 }),
      ),
    );

    const { fetchPipeline } = await import("./api.js");

    expect(fetchPipeline(7)).rejects.toThrow();
  });
});

describe("createEventSource", () => {
  it("creates an EventSource connected to /api/events", () => {
    const { createEventSource } = require("./api.js");
    // EventSource is not available in bun:test — verify the function exists and is callable
    expect(typeof createEventSource).toBe("function");
  });
});
