/**
 * Dashboard routes — read-only endpoints for the dashboard UI.
 * Provides job listing, pipeline state, real-time SSE events,
 * and conversation replay for completed jobs.
 */

import { Hono } from "hono";
import { z } from "zod";
import type { JobHistory, ConversationHistory } from "@crewline/worker";
import {
  toJobSummary,
  aggregatePipelineState,
} from "@crewline/shared";
import type { DashboardSSEEvent } from "@crewline/shared";

export interface DashboardDependencies {
  /** Read-only job history instance (must not call record()) */
  jobHistory: JobHistory;
  /** Read-only conversation history for replay (optional — not available until wired) */
  conversationHistory?: ConversationHistory;
}

/** Subscriber callback for SSE events (widened to DashboardSSEEvent union) */
export type SSESubscriber = (event: DashboardSSEEvent) => void;

const jobStatusSchema = z.enum(["pending", "running", "completed", "failed"]);

/**
 * Creates the dashboard Hono sub-app with job listing, pipeline state,
 * SSE endpoints, and conversation replay.
 *
 * @param deps - Dashboard dependencies (job history, conversation history)
 * @returns An object with the Hono app and methods to manage SSE subscribers
 */
export function createDashboardRoutes(deps: DashboardDependencies) {
  const app = new Hono();
  const subscribers = new Set<SSESubscriber>();

  app.get("/jobs", (c) => {
    const statusParam = c.req.query("status");

    if (statusParam !== undefined) {
      const result = jobStatusSchema.safeParse(statusParam);
      if (!result.success) {
        return c.json(
          { error: `Invalid status filter: must be one of pending, running, completed, failed` },
          400,
        );
      }
      const jobs = deps.jobHistory.listByStatus(result.data);
      return c.json({ jobs: jobs.map(toJobSummary) });
    }

    const jobs = deps.jobHistory.listAll();
    return c.json({ jobs: jobs.map(toJobSummary) });
  });

  app.get("/pipeline/:issueNumber", (c) => {
    const issueNumberParam = c.req.param("issueNumber");
    const issueNumber = Number(issueNumberParam);

    if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
      return c.json({ error: "Invalid issue number" }, 400);
    }

    const jobs = deps.jobHistory.listByIssueNumber(issueNumber);
    const pipelineState = aggregatePipelineState(issueNumber, jobs);
    return c.json(pipelineState);
  });

  app.get("/jobs/:jobId/conversation", (c) => {
    if (!deps.conversationHistory) {
      return c.json({ error: "Conversation history not available" }, 503);
    }

    const jobId = c.req.param("jobId");
    const events = deps.conversationHistory.listByJobId(jobId);
    return c.json({ events });
  });

  app.get("/events", (c) => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        const subscriber: SSESubscriber = (event) => {
          const data = JSON.stringify(event);
          controller.enqueue(
            encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`),
          );
        };

        subscribers.add(subscriber);
        console.log(`[sse] Client connected (${String(subscribers.size)} total)`);

        /** Send initial comment to trigger EventSource onopen immediately */
        controller.enqueue(encoder.encode(": connected\n\n"));

        /** Send a keep-alive comment every 30 seconds */
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": keep-alive\n\n"));
          } catch {
            clearInterval(keepAlive);
          }
        }, 30_000);

        /** Clean up on disconnect */
        c.req.raw.signal.addEventListener("abort", () => {
          subscribers.delete(subscriber);
          clearInterval(keepAlive);
          console.log(`[sse] Client disconnected (${String(subscribers.size)} remaining)`);
        });
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  });

  return Object.assign(app, {
    /**
     * Publishes a dashboard SSE event to all connected clients.
     * Accepts both JobLifecycleEvent and ConversationSSEEvent.
     *
     * @param event - The SSE event to broadcast
     */
    publish(event: DashboardSSEEvent): void {
      console.log(`[sse] Publishing ${event.type} to ${String(subscribers.size)} client(s)`);
      for (const subscriber of subscribers) {
        subscriber(event);
      }
    },

    /** Returns the current number of connected SSE clients */
    get subscriberCount(): number {
      return subscribers.size;
    },
  });
}
