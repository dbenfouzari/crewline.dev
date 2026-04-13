import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { Database } from "bun:sqlite";
import { JobHistory, ConversationHistory } from "@crewline/worker";
import type { Job, JobLifecycleEvent, ConversationEvent } from "@crewline/shared";
import { toJobSummary } from "@crewline/shared";
import { createDashboardRoutes } from "./dashboard.js";

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

function makeConversationEvent(overrides: Partial<ConversationEvent> = {}): ConversationEvent {
  return {
    id: crypto.randomUUID(),
    jobId: "job-1",
    type: "assistant:text",
    payload: { type: "assistant", message: { content: [{ type: "text", text: "hello" }] } },
    sequenceNumber: 0,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("Dashboard Routes", () => {
  let database: Database;
  let history: JobHistory;
  let conversationHistory: ConversationHistory;
  let app: Hono;
  let dashboardRoutes: ReturnType<typeof createDashboardRoutes>;

  beforeEach(() => {
    database = JobHistory.openDatabase(":memory:");
    history = new JobHistory(database);
    conversationHistory = new ConversationHistory(database);
    dashboardRoutes = createDashboardRoutes({ jobHistory: history, conversationHistory });
    app = new Hono();
    app.route("/", dashboardRoutes);
  });

  afterEach(() => {
    database.close();
  });

  describe("GET /jobs", () => {
    it("returns all jobs as summaries without payload", async () => {
      const job = makeJob();
      history.record(job);

      const response = await app.request("/jobs");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { jobs: Record<string, unknown>[] };
      expect(body.jobs).toHaveLength(1);
      expect(body.jobs[0]!["id"]).toBe(job.id);
      expect(body.jobs[0]!["agentName"]).toBe("dev");
      expect(body.jobs[0]).not.toHaveProperty("payload");
    });

    it("filters jobs by status query parameter", async () => {
      history.record(makeJob({ status: "completed" }));
      history.record(makeJob({ status: "completed" }));
      history.record(makeJob({ status: "failed", exitCode: 1 }));

      const response = await app.request("/jobs?status=failed");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { jobs: Record<string, unknown>[] };
      expect(body.jobs).toHaveLength(1);
      expect(body.jobs[0]!["status"]).toBe("failed");
    });

    it("returns all jobs when no status filter is provided", async () => {
      history.record(makeJob({ status: "completed" }));
      history.record(makeJob({ status: "failed" }));
      history.record(makeJob({ status: "running" }));

      const response = await app.request("/jobs");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { jobs: Record<string, unknown>[] };
      expect(body.jobs).toHaveLength(3);
    });

    it("returns 400 for invalid status filter", async () => {
      const response = await app.request("/jobs?status=invalid");
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBeDefined();
    });

    it("returns empty array when no jobs exist", async () => {
      const response = await app.request("/jobs");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { jobs: unknown[] };
      expect(body.jobs).toHaveLength(0);
    });
  });

  describe("GET /pipeline/:issueNumber", () => {
    it("returns pipeline state for an issue", async () => {
      history.record(
        makeJob({
          agentName: "requirementsGatherer",
          targetNumber: 42,
          status: "completed",
        }),
      );
      history.record(
        makeJob({
          agentName: "architect",
          targetNumber: 42,
          status: "running",
          completedAt: null,
        }),
      );

      const response = await app.request("/pipeline/42");
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        issueNumber: number;
        stages: { agentName: string; status: string }[];
      };
      expect(body.issueNumber).toBe(42);
      expect(body.stages).toHaveLength(2);

      const requirementsStage = body.stages.find(
        (s) => s.agentName === "requirementsGatherer",
      );
      expect(requirementsStage!.status).toBe("completed");

      const architectStage = body.stages.find(
        (s) => s.agentName === "architect",
      );
      expect(architectStage!.status).toBe("running");
    });

    it("returns empty stages when no jobs exist for the issue", async () => {
      const response = await app.request("/pipeline/999");
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        issueNumber: number;
        stages: unknown[];
      };
      expect(body.issueNumber).toBe(999);
      expect(body.stages).toHaveLength(0);
    });

    it("picks the most recent job per agent when retried", async () => {
      history.record(
        makeJob({
          agentName: "dev",
          targetNumber: 10,
          status: "failed",
          createdAt: "2025-01-01T00:00:00Z",
          exitCode: 1,
        }),
      );
      history.record(
        makeJob({
          agentName: "dev",
          targetNumber: 10,
          status: "completed",
          createdAt: "2025-01-02T00:00:00Z",
        }),
      );

      const response = await app.request("/pipeline/10");
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        stages: { agentName: string; status: string }[];
      };
      expect(body.stages).toHaveLength(1);
      expect(body.stages[0]!.status).toBe("completed");
    });

    it("returns 400 for non-numeric issue number", async () => {
      const response = await app.request("/pipeline/abc");
      expect(response.status).toBe(400);
    });

    it("returns 400 for zero issue number", async () => {
      const response = await app.request("/pipeline/0");
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Invalid issue number");
    });

    it("returns 400 for negative issue number", async () => {
      const response = await app.request("/pipeline/-1");
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Invalid issue number");
    });

    it("returns unified pipeline with both issue and PR stages", async () => {
      // Issue-triggered jobs (targetNumber = issue, issueNumber = null)
      history.record(
        makeJob({
          agentName: "requirementsGatherer",
          targetNumber: 42,
          issueNumber: null,
          status: "completed",
        }),
      );
      history.record(
        makeJob({
          agentName: "dev",
          targetNumber: 42,
          issueNumber: null,
          status: "completed",
        }),
      );
      // PR-triggered jobs (targetNumber = PR#, issueNumber = issue#)
      history.record(
        makeJob({
          agentName: "testMaster",
          targetNumber: 50,
          issueNumber: 42,
          status: "completed",
        }),
      );
      history.record(
        makeJob({
          agentName: "techLead",
          targetNumber: 50,
          issueNumber: 42,
          status: "running",
          completedAt: null,
        }),
      );

      const response = await app.request("/pipeline/42");
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        issueNumber: number;
        stages: { agentName: string; status: string }[];
      };
      expect(body.issueNumber).toBe(42);
      expect(body.stages).toHaveLength(4);

      const agentNames = body.stages.map((s) => s.agentName).sort();
      expect(agentNames).toEqual(["dev", "requirementsGatherer", "techLead", "testMaster"]);
    });
  });

  describe("GET /jobs/:jobId/conversation", () => {
    it("returns conversation events for a job ordered by sequence number", async () => {
      const event1 = makeConversationEvent({ sequenceNumber: 0 });
      const event2 = makeConversationEvent({ sequenceNumber: 1, type: "assistant:tool_use" });
      conversationHistory.record(event1);
      conversationHistory.record(event2);

      const response = await app.request("/jobs/job-1/conversation");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { events: ConversationEvent[] };
      expect(body.events).toHaveLength(2);
      expect(body.events[0]!.sequenceNumber).toBe(0);
      expect(body.events[1]!.sequenceNumber).toBe(1);
    });

    it("returns empty events array for unknown job ID", async () => {
      const response = await app.request("/jobs/nonexistent/conversation");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { events: ConversationEvent[] };
      expect(body.events).toHaveLength(0);
    });

    it("returns 503 when conversation history is not available", async () => {
      const routesWithoutConversation = createDashboardRoutes({ jobHistory: history });
      const appWithout = new Hono();
      appWithout.route("/", routesWithoutConversation);

      const response = await appWithout.request("/jobs/job-1/conversation");
      expect(response.status).toBe(503);
    });
  });

  describe("GET /events (SSE)", () => {
    it("returns a streaming response with correct content type", async () => {
      const response = await app.request("/events");
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/event-stream");
      expect(response.headers.get("cache-control")).toBe("no-cache");
      expect(response.headers.get("connection")).toBe("keep-alive");
    });

    it("delivers published job lifecycle events to connected SSE clients", async () => {
      const response = await app.request("/events");
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // Skip initial ": connected" comment
      await reader.read();

      const job = makeJob({ agentName: "architect", status: "completed" });
      const event: JobLifecycleEvent = {
        type: "job:completed",
        job: toJobSummary(job),
      };

      // Skip the initial ": connected" comment
      await reader.read();

      dashboardRoutes.publish(event);

      const { value } = await reader.read();
      const text = decoder.decode(value);

      expect(text).toContain("event: job:completed");
      expect(text).toContain(`"agentName":"architect"`);
      expect(text).not.toContain("payload");

      reader.cancel();
    });

    it("delivers conversation events to connected SSE clients", async () => {
      const response = await app.request("/events");
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // Skip initial ": connected" comment
      await reader.read();

      const conversationEvent = makeConversationEvent();
      dashboardRoutes.publish({
        type: "conversation:event",
        event: conversationEvent,
      });

      const { value } = await reader.read();
      const text = decoder.decode(value);

      expect(text).toContain("event: conversation:event");
      expect(text).toContain(`"jobId":"job-1"`);

      reader.cancel();
    });

    it("delivers multiple events in sequence to a connected client", async () => {
      const response = await app.request("/events");
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // Skip initial ": connected" comment
      await reader.read();

      const job1 = makeJob({ agentName: "requirementsGatherer", status: "completed" });
      const job2 = makeJob({ agentName: "dev", status: "failed" });

      // Skip the initial ": connected" comment
      await reader.read();

      dashboardRoutes.publish({ type: "job:completed", job: toJobSummary(job1) });
      dashboardRoutes.publish({ type: "job:failed", job: toJobSummary(job2) });

      const { value: chunk1 } = await reader.read();
      const text1 = decoder.decode(chunk1);
      expect(text1).toContain("event: job:completed");
      expect(text1).toContain(`"agentName":"requirementsGatherer"`);

      const { value: chunk2 } = await reader.read();
      const text2 = decoder.decode(chunk2);
      expect(text2).toContain("event: job:failed");
      expect(text2).toContain(`"agentName":"dev"`);

      reader.cancel();
    });
  });
});
