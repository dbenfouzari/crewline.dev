/**
 * Recovery module: scans GitHub for issues/PRs with active pipeline labels
 * and re-enqueues the corresponding jobs on startup.
 * Ensures crash recovery without manual re-labelling.
 */

import type { CrewlineConfig, NewJob } from "@crewline/shared";
import { AGENT_PRIORITY, DEFAULT_PRIORITY, buildPipelineLabels } from "@crewline/shared";
import type { GitHubSearchClient } from "./github-search-client.js";

/**
 * Defense-in-depth guard: validates that a target number is a finite positive integer
 * before enqueuing. Even if the Zod parse in the search client is bypassed,
 * invalid jobs must not enter the queue.
 */
function isValidTargetNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

interface RecoverPendingWorkOptions {
  config: CrewlineConfig;
  queue: {
    enqueue(job: NewJob): Promise<string>;
    getActiveJobKeys(): Promise<Set<string>>;
  };
  githubClient: GitHubSearchClient;
}

/**
 * Scans GitHub for open issues/PRs with active pipeline labels and re-enqueues
 * the corresponding jobs. Deduplicates against the existing queue.
 *
 * @param options - Configuration, queue, and GitHub client
 * @returns Number of jobs recovered
 */
export async function recoverPendingWork(
  options: RecoverPendingWorkOptions,
): Promise<number> {
  const { config, queue, githubClient } = options;

  const pipelineLabels = buildPipelineLabels(config.agents);
  if (pipelineLabels.length === 0) {
    console.log("[recovery] No pipeline labels configured — nothing to recover");
    return 0;
  }

  const activeKeys = await queue.getActiveJobKeys();

  // Collect all candidates: Map<"repo:number" → { agentKey, label, payload, priority }>
  // For each item, keep only the furthest-along agent (lowest priority number)
  const candidates = new Map<string, {
    agentKey: string;
    label: string;
    payload: string;
    repository: string;
    targetNumber: number;
    priority: number;
  }>();

  for (const repo of config.github.repos) {
    for (const pipelineLabel of pipelineLabels) {
      try {
        if (pipelineLabel.entityType === "issue") {
          const results = await githubClient.findOpenIssuesWithLabel(repo, pipelineLabel.label);
          for (const result of results) {
            if (!isValidTargetNumber(result.issue.number)) {
              console.warn(`[recovery] Skipping issue with invalid target number in ${repo}: ${String(result.issue.number)}`);
              continue;
            }

            const candidateKey = `${repo}:${String(result.issue.number)}`;
            const priority = AGENT_PRIORITY[pipelineLabel.agentKey] ?? DEFAULT_PRIORITY;
            const existing = candidates.get(candidateKey);

            if (existing && existing.priority <= priority) continue;

            const syntheticPayload = JSON.stringify({
              action: "labeled",
              label: { id: 0, name: pipelineLabel.label, color: "000000" },
              issue: result.issue,
              repository: result.repository,
              sender: result.issue.user,
            });

            candidates.set(candidateKey, {
              agentKey: pipelineLabel.agentKey,
              label: pipelineLabel.label,
              payload: syntheticPayload,
              repository: repo,
              targetNumber: result.issue.number,
              priority,
            });
          }
        } else {
          const results = await githubClient.findOpenPullRequestsWithLabel(repo, pipelineLabel.label);
          for (const result of results) {
            if (!isValidTargetNumber(result.pullRequest.number)) {
              console.warn(`[recovery] Skipping PR with invalid target number in ${repo}: ${String(result.pullRequest.number)}`);
              continue;
            }

            const candidateKey = `${repo}:${String(result.pullRequest.number)}`;
            const priority = AGENT_PRIORITY[pipelineLabel.agentKey] ?? DEFAULT_PRIORITY;
            const existing = candidates.get(candidateKey);

            if (existing && existing.priority <= priority) continue;

            const syntheticPayload = JSON.stringify({
              action: "labeled",
              label: { id: 0, name: pipelineLabel.label, color: "000000" },
              pull_request: result.pullRequest,
              repository: result.repository,
              sender: result.pullRequest.user,
            });

            candidates.set(candidateKey, {
              agentKey: pipelineLabel.agentKey,
              label: pipelineLabel.label,
              payload: syntheticPayload,
              repository: repo,
              targetNumber: result.pullRequest.number,
              priority,
            });
          }
        }
      } catch (error) {
        console.error(
          `[recovery] Failed to scan ${repo} for label "${pipelineLabel.label}":`,
          error,
        );
      }
    }
  }

  let recoveredCount = 0;

  for (const [_key, candidate] of candidates) {
    const jobKey = `${candidate.agentKey}:${candidate.repository}:${String(candidate.targetNumber)}`;

    if (activeKeys.has(jobKey)) {
      console.log(`[recovery] Skipping duplicate: ${jobKey}`);
      continue;
    }

    const parsed = JSON.parse(candidate.payload) as Record<string, unknown>;
    const issue = parsed["issue"] as { title?: string } | undefined;
    const pr = parsed["pull_request"] as { title?: string } | undefined;
    const targetTitle = issue?.title ?? pr?.title ?? null;

    const jobId = await queue.enqueue({
      agentName: candidate.agentKey,
      payload: candidate.payload,
      repository: candidate.repository,
      targetNumber: candidate.targetNumber,
      targetTitle,
    });

    console.log(
      `[recovery] Re-enqueued agent "${candidate.agentKey}" for ${candidate.repository}#${String(candidate.targetNumber)} (job ${jobId})`,
    );
    recoveredCount++;
  }

  console.log(`[recovery] Recovery complete: ${String(recoveredCount)} job(s) re-enqueued`);
  return recoveredCount;
}
