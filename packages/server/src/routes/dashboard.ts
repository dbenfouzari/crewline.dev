/**
 * Dashboard routes — read-only endpoints for the dashboard UI.
 * Provides job listing, pipeline state, and real-time SSE events.
 */

import { Hono } from "hono";
import { z } from "zod";
import type { JobHistory } from "@crewline/worker";
import {
  toJobSummary,
  aggregatePipelineState,
} from "@crewline/shared";
import type { JobLifecycleEvent } from "@crewline/shared";

export interface DashboardDependencies {
  /** Read-only job history instance (must not call record()) */
  jobHistory: JobHistory;
}

/** Subscriber callback for SSE events */
export type SSESubscriber = (event: JobLifecycleEvent) => void;

const jobStatusSchema = z.enum(["pending", "running", "completed", "failed"]);

/**
 * Creates the dashboard Hono sub-app with job listing, pipeline state,
 * and SSE endpoints.
 *
 * @param deps - Dashboard dependencies (job history)
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

    const jobs = deps.jobHistory.listByTargetNumber(issueNumber);
    const pipelineState = aggregatePipelineState(issueNumber, jobs);
    return c.json(pipelineState);
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
     * Publishes a job lifecycle event to all connected SSE clients.
     *
     * @param event - The lifecycle event to broadcast
     */
    publish(event: JobLifecycleEvent): void {
      console.log(`[sse] Publishing ${event.type} for ${event.job.agentName}#${String(event.job.targetNumber)} to ${String(subscribers.size)} client(s)`);
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
