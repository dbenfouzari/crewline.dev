/**
 * Server entry point.
 * Loads config, starts Hono, routes webhook events to BullMQ.
 * Subscribes to conversation events via Redis pub/sub and relays them to SSE clients.
 */

import { createApp } from "./app.js";
import { matchAgents } from "./router.js";
import { createJobQueue, JobHistory, ConversationHistory, QUEUE_NAME } from "@crewline/worker";
import type { CrewlineConfig, GitHubEventName, JobSummary, JobStatus } from "@crewline/shared";
import { parseLinkedIssueNumbers } from "@crewline/shared";
import { recoverPendingWork } from "./recovery.js";
import { createGitHubSearchClient } from "./github-search-client.js";
import { createDashboardRoutes } from "./routes/dashboard.js";
import { createConversationSubscriber } from "./conversation-subscriber.js";
import { QueueEvents } from "bullmq";
import type { Job as BullJob } from "bullmq";

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

  const database = JobHistory.openDatabase(databasePath);
  const jobHistory = new JobHistory(database);
  const conversationHistory = new ConversationHistory(database);

  const dashboardRoutes = createDashboardRoutes({ jobHistory, conversationHistory });

  // Subscribe to conversation events from worker via Redis pub/sub
  const conversationSubscriber = createConversationSubscriber(redisConnection);
  conversationSubscriber.onEvent((event) => {
    dashboardRoutes.publish({ type: "conversation:event", event });
  });

  const queueEvents = new QueueEvents(QUEUE_NAME, { connection: redisConnection });

  queueEvents.on("waiting", async ({ jobId }) => {
    const bullJob = await queue.raw.getJob(jobId);
    if (!bullJob) return;
    dashboardRoutes.publish({
      type: "job:enqueued",
      job: buildJobSummary(bullJob, "pending"),
    });
  });

  queueEvents.on("active", async ({ jobId }) => {
    const bullJob = await queue.raw.getJob(jobId);
    if (!bullJob) return;
    dashboardRoutes.publish({
      type: "job:started",
      job: buildJobSummary(bullJob, "running"),
    });
  });

  queueEvents.on("completed", async ({ jobId }) => {
    const bullJob = await queue.raw.getJob(jobId);
    if (!bullJob) return;
    const returnValue = bullJob.returnvalue as { exitCode?: number; result?: string } | undefined;
    dashboardRoutes.publish({
      type: "job:completed",
      job: {
        ...buildJobSummary(bullJob, "completed"),
        completedAt: bullJob.finishedOn ? new Date(bullJob.finishedOn).toISOString() : new Date().toISOString(),
        result: returnValue?.result ?? null,
        exitCode: returnValue?.exitCode ?? null,
      },
    });
  });

  queueEvents.on("failed", async ({ jobId, failedReason }) => {
    const bullJob = await queue.raw.getJob(jobId);
    if (!bullJob) return;
    dashboardRoutes.publish({
      type: "job:failed",
      job: {
        ...buildJobSummary(bullJob, "failed"),
        completedAt: bullJob.finishedOn ? new Date(bullJob.finishedOn).toISOString() : new Date().toISOString(),
        result: failedReason,
        exitCode: null,
      },
    });
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
        const issueNumber = extractIssueNumberFromPR(payload);
        const targetTitle = extractTargetTitle(payload);
        const jobId = await queue.enqueue({
          agentName: agentKey,
          payload: JSON.stringify(payload),
          repository: repo ?? "unknown",
          targetNumber,
          issueNumber,
          targetTitle,
        });
        console.log(`[server] Enqueued job ${jobId} for agent "${agentKey}" on ${repo}#${String(targetNumber)}`);
      }
    },
  });

  const server = Bun.serve({
    port,
    fetch: app.fetch,
    idleTimeout: 255, // Max value — SSE connections need to stay open
  });

  console.log(`[server] Crewline server listening on http://localhost:${String(server.port)}`);
  console.log(`[server] Watching repos: ${config.github.repos.join(", ")}`);
  console.log(`[server] Agents: ${Object.keys(config.agents).join(", ")}`);

  // Fire-and-forget recovery — must not block webhook processing
  const githubClient = createGitHubSearchClient();
  recoverPendingWork({ config, queue, githubClient }).catch((error: unknown) => {
    console.error("[server] Recovery failed (non-fatal):", error);
  });

  return { server, queue, jobHistory, conversationHistory, queueEvents, conversationSubscriber };
}

/**
 * Builds a JobSummary from a BullMQ job and the current lifecycle status.
 * This avoids relying on JobHistory lookups which use a different ID than BullMQ.
 *
 * @param bullJob - The BullMQ job instance
 * @param status - The current job lifecycle status
 * @returns A JobSummary constructed from the BullMQ job data
 */
function buildJobSummary(bullJob: BullJob, status: JobStatus): JobSummary {
  return {
    id: bullJob.id ?? crypto.randomUUID(),
    agentName: bullJob.data.agentName as string,
    status,
    repository: bullJob.data.repository as string,
    targetNumber: bullJob.data.targetNumber as number,
    issueNumber: (bullJob.data.issueNumber as number | null) ?? null,
    targetTitle: (bullJob.data.targetTitle as string) ?? null,
    createdAt: new Date(bullJob.timestamp).toISOString(),
    startedAt: bullJob.processedOn ? new Date(bullJob.processedOn).toISOString() : null,
    completedAt: null,
    result: null,
    exitCode: null,
  };
}

function extractTargetNumber(payload: Record<string, unknown>): number {
  const issue = payload["issue"] as { number?: number } | undefined;
  if (issue?.number) return issue.number;

  const pr = payload["pull_request"] as { number?: number } | undefined;
  if (pr?.number) return pr.number;

  return 0;
}

/**
 * Extracts the linked issue number from a PR payload by parsing closing keywords
 * (Closes, Fixes, Resolves) from the PR body. Returns the first linked issue number
 * or null if the payload is not a PR or has no closing references.
 *
 * @param payload - The GitHub webhook payload
 * @returns The first linked issue number, or null
 */
function extractIssueNumberFromPR(payload: Record<string, unknown>): number | null {
  const pr = payload["pull_request"] as { body?: string | null } | undefined;
  if (!pr?.body) return null;

  const linkedIssues = parseLinkedIssueNumbers(pr.body);
  return linkedIssues[0] ?? null;
}

/**
 * Extracts the human-readable title from a GitHub webhook payload.
 * Checks `issue.title` first, then `pull_request.title`.
 *
 * @param payload - Raw GitHub webhook payload
 * @returns The issue/PR title, or null if not found
 */
export function extractTargetTitle(payload: Record<string, unknown>): string | null {
  const issue = payload["issue"] as { title?: string } | undefined;
  if (typeof issue?.title === "string") return issue.title;

  const pr = payload["pull_request"] as { title?: string } | undefined;
  if (typeof pr?.title === "string") return pr.title;

  return null;
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
export { createConversationSubscriber } from "./conversation-subscriber.js";
export type { ConversationSubscriber } from "./conversation-subscriber.js";
