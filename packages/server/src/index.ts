/**
 * Server entry point.
 * Loads config, starts Hono, routes webhook events to BullMQ.
 */

import { createApp } from "./app.js";
import { matchAgents } from "./router.js";
import { createJobQueue, JobHistory, QUEUE_NAME } from "@crewline/worker";
import type { CrewlineConfig, GitHubEventName } from "@crewline/shared";
import { toJobSummary } from "@crewline/shared";
import { recoverPendingWork } from "./recovery.js";
import { createGitHubSearchClient } from "./github-search-client.js";
import { createDashboardRoutes } from "./routes/dashboard.js";
import { QueueEvents } from "bullmq";

export interface StartServerOptions {
  config: CrewlineConfig;
  redisUrl?: string;
  port?: number;
  /** Path to the SQLite database file (default: "./crewline.db") */
  databasePath?: string;
}

export async function startServer(options: StartServerOptions) {
  const { config, redisUrl = "redis://localhost:6379", port = 3000, databasePath = "./crewline.db" } = options;

  const redisConnection = { host: new URL(redisUrl).hostname, port: Number(new URL(redisUrl).port) || 6379 };
  const queue = createJobQueue(redisConnection);

  const jobHistory = new JobHistory(databasePath);
  const dashboardRoutes = createDashboardRoutes({ jobHistory });

  const queueEvents = new QueueEvents(QUEUE_NAME, { connection: redisConnection });

  queueEvents.on("waiting", async ({ jobId }) => {
    const job = jobHistory.getById(jobId);
    if (job) {
      dashboardRoutes.publish({ type: "job:enqueued", job: toJobSummary(job) });
    }
  });

  queueEvents.on("active", async ({ jobId }) => {
    const job = jobHistory.getById(jobId);
    if (job) {
      dashboardRoutes.publish({ type: "job:started", job: toJobSummary(job) });
    }
  });

  queueEvents.on("completed", async ({ jobId }) => {
    const job = jobHistory.getById(jobId);
    if (job) {
      dashboardRoutes.publish({ type: "job:completed", job: toJobSummary(job) });
    }
  });

  queueEvents.on("failed", async ({ jobId }) => {
    const job = jobHistory.getById(jobId);
    if (job) {
      dashboardRoutes.publish({ type: "job:failed", job: toJobSummary(job) });
    }
  });

  const app = createApp({
    webhookSecret: config.github.webhookSecret,
    dashboardRoutes,
    onEvent: async ({ eventName, payload }) => {
      const repo = (payload["repository"] as { full_name?: string })?.full_name;

      // Check if this repo is configured
      if (repo && !config.github.repos.includes(repo)) {
        console.log(`[server] Ignoring event from unconfigured repo: ${repo}`);
        return;
      }

      const matches = matchAgents(config.agents, eventName as GitHubEventName, payload);

      if (matches.length === 0) {
        console.log(`[server] No agent matched for ${eventName}.${payload["action"] as string}`);
        return;
      }

      for (const [agentKey, _agent] of matches) {
        const targetNumber = extractTargetNumber(payload);
        const jobId = await queue.enqueue({
          agentName: agentKey,
          payload: JSON.stringify(payload),
          repository: repo ?? "unknown",
          targetNumber,
        });
        console.log(`[server] Enqueued job ${jobId} for agent "${agentKey}" on ${repo}#${String(targetNumber)}`);
      }
    },
  });

  const server = Bun.serve({
    port,
    fetch: app.fetch,
  });

  console.log(`[server] Crewline server listening on http://localhost:${String(server.port)}`);
  console.log(`[server] Watching repos: ${config.github.repos.join(", ")}`);
  console.log(`[server] Agents: ${Object.keys(config.agents).join(", ")}`);

  // Fire-and-forget recovery — must not block webhook processing
  const githubClient = createGitHubSearchClient();
  recoverPendingWork({ config, queue, githubClient }).catch((error: unknown) => {
    console.error("[server] Recovery failed (non-fatal):", error);
  });

  return { server, queue, jobHistory, queueEvents };
}

function extractTargetNumber(payload: Record<string, unknown>): number {
  const issue = payload["issue"] as { number?: number } | undefined;
  if (issue?.number) return issue.number;

  const pr = payload["pull_request"] as { number?: number } | undefined;
  if (pr?.number) return pr.number;

  return 0;
}

export { createApp } from "./app.js";
export { matchAgents } from "./router.js";
export type { AppOptions, WebhookEvent } from "./app.js";
export { verifyGitHubSignature } from "./middleware/github-signature.js";
export { recoverPendingWork } from "./recovery.js";
export { createGitHubSearchClient } from "./github-search-client.js";
export type { GitHubSearchClient, IssueSearchResult, PullRequestSearchResult } from "./github-search-client.js";
export { createDashboardRoutes } from "./routes/dashboard.js";
export type { DashboardDependencies, SSESubscriber } from "./routes/dashboard.js";
