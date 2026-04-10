/**
 * Worker entry point.
 * Listens to BullMQ queue, processes jobs by executing Claude CLI.
 */

import { createJobWorker, type QueueJobData } from "./queue.js";
import { JobHistory } from "./job-history.js";
import { executeAgent } from "./executor.js";
import type { CrewlineConfig, Job } from "@crewline/shared";

export interface StartWorkerOptions {
  config: CrewlineConfig;
  redisUrl?: string;
  databasePath?: string;
  workspacePath?: string;
  concurrency?: number;
}

export async function startWorker(options: StartWorkerOptions) {
  const {
    config,
    redisUrl = "redis://localhost:6379",
    databasePath = "./crewline.db",
    workspacePath = "/tmp/crewline-workspaces",
    concurrency = 1,
  } = options;

  const history = new JobHistory(databasePath);
  const url = new URL(redisUrl);
  const connection = { host: url.hostname, port: Number(url.port) || 6379 };

  const worker = createJobWorker(
    connection,
    async (data: QueueJobData) => {
      const agent = config.agents[data.agentName];
      if (!agent) {
        throw new Error(`Unknown agent: ${data.agentName}`);
      }

      const payload = JSON.parse(data.payload) as Record<string, unknown>;
      const repo = payload["repository"] as { clone_url?: string; full_name?: string } | undefined;
      const cloneUrl = repo?.clone_url ?? "";

      // Prepare workspace
      const workDir = `${workspacePath}/${data.repository.replace("/", "-")}-${Date.now()}`;
      await Bun.$`git clone ${cloneUrl} ${workDir}`.quiet();

      console.log(`[worker] Running agent "${data.agentName}" on ${data.repository}#${String(data.targetNumber)}`);

      // Build prompt with context
      const issueContext = buildIssueContext(payload);
      const fullPrompt = `${agent.prompt}\n\n${issueContext}`;

      // Record job as running
      const job: Job = {
        id: crypto.randomUUID(),
        agentName: data.agentName,
        status: "running",
        payload: data.payload,
        repository: data.repository,
        targetNumber: data.targetNumber,
        issueNumber: data.issueNumber,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: null,
        result: null,
        exitCode: null,
      };
      history.record(job);

      // Execute Claude CLI
      const result = await executeAgent({ prompt: fullPrompt, workDir });

      // Record completion
      const completedJob: Job = {
        ...job,
        status: result.exitCode === 0 ? "completed" : "failed",
        completedAt: new Date().toISOString(),
        result: result.stdout || result.stderr,
        exitCode: result.exitCode,
      };
      history.record(completedJob);

      console.log(`[worker] Agent "${data.agentName}" finished with exit code ${String(result.exitCode)}`);

      // Cleanup workspace
      await Bun.$`rm -rf ${workDir}`.quiet();

      return { exitCode: result.exitCode, result: result.stdout || result.stderr };
    },
    { concurrency },
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id ?? "unknown"} failed:`, err.message);
  });

  console.log(`[worker] Crewline worker started (concurrency: ${String(concurrency)})`);
  console.log(`[worker] Agents: ${Object.keys(config.agents).join(", ")}`);

  return { worker, history };
}

function buildIssueContext(payload: Record<string, unknown>): string {
  const issue = payload["issue"] as { number?: number; title?: string; body?: string } | undefined;
  if (issue) {
    return [
      `## Issue #${String(issue.number)}: ${issue.title ?? ""}`,
      "",
      issue.body ?? "(no description)",
    ].join("\n");
  }

  const pr = payload["pull_request"] as { number?: number; title?: string; body?: string } | undefined;
  if (pr) {
    return [
      `## PR #${String(pr.number)}: ${pr.title ?? ""}`,
      "",
      pr.body ?? "(no description)",
    ].join("\n");
  }

  return "";
}

export { createJobQueue, createJobWorker, QUEUE_NAME } from "./queue.js";
export type { QueueJobData, JobProcessor } from "./queue.js";
export { JobHistory } from "./job-history.js";
export { executeAgent, buildClaudeArgs } from "./executor.js";
export type { ExecutorOptions, ExecutorResult } from "./executor.js";
