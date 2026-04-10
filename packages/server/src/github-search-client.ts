/**
 * GitHub search client for finding open issues and PRs by label.
 * Used during recovery to discover pending pipeline work.
 */

import { z } from "zod";
import type {
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepository,
} from "@crewline/shared";

/** Result of searching for issues with a specific label. */
export interface IssueSearchResult {
  issue: GitHubIssue;
  repository: GitHubRepository;
}

/** Result of searching for pull requests with a specific label. */
export interface PullRequestSearchResult {
  pullRequest: GitHubPullRequest;
  repository: GitHubRepository;
}

/**
 * Abstraction over the GitHub API for finding open issues/PRs by label.
 * Interface-based for testability — tests inject a mock, production uses `gh`.
 */
export interface GitHubSearchClient {
  /** Find all open issues in a repository with the given label. */
  findOpenIssuesWithLabel(
    repository: string,
    label: string,
  ): Promise<IssueSearchResult[]>;

  /** Find all open pull requests in a repository with the given label. */
  findOpenPullRequestsWithLabel(
    repository: string,
    label: string,
  ): Promise<PullRequestSearchResult[]>;
}

/**
 * Schema for `gh issue list --json` output.
 * Different from the webhook payload format.
 */
const ghIssueListSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().default(null),
  labels: z.array(z.object({ name: z.string(), color: z.string() })),
  author: z.object({ login: z.string() }),
  state: z.string(),
});

/**
 * Schema for `gh pr list --json` output.
 */
const ghPrListSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().default(null),
  labels: z.array(z.object({ name: z.string(), color: z.string() })),
  author: z.object({ login: z.string() }),
  state: z.string(),
  headRefName: z.string().default(""),
  headRefOid: z.string().default(""),
  baseRefName: z.string().default(""),
  baseRefOid: z.string().default(""),
  isDraft: z.boolean().default(false),
});

/**
 * Creates a GitHubSearchClient that uses the `gh` CLI.
 * Requires `gh` CLI to be authenticated in the environment.
 */
export function createGitHubSearchClient(): GitHubSearchClient {
  return {
    async findOpenIssuesWithLabel(
      repository: string,
      label: string,
    ): Promise<IssueSearchResult[]> {
      try {
        const proc = Bun.spawn([
          "gh", "issue", "list",
          "--repo", repository,
          "--label", label,
          "--state", "open",
          "--json", "number,title,body,labels,author,state",
        ], { stdout: "pipe", stderr: "pipe" });

        const stdout = await new Response(proc.stdout).text();
        await proc.exited;

        if (!stdout.trim()) return [];

        const raw = JSON.parse(stdout) as unknown[];
        return raw.map((item) => {
          const parsed = ghIssueListSchema.parse(item);
          return {
            issue: {
              number: parsed.number,
              title: parsed.title,
              body: parsed.body,
              labels: parsed.labels.map((l) => ({ id: 0, name: l.name, color: l.color })),
              user: { login: parsed.author.login, id: 0, avatar_url: "" },
              state: parsed.state.toLowerCase() as "open" | "closed",
            },
            repository: {
              id: 0,
              full_name: repository,
              clone_url: `https://github.com/${repository}.git`,
              default_branch: "main",
            },
          };
        });
      } catch (error) {
        console.error(`[recovery] Failed to search issues in ${repository} with label "${label}":`, error);
        return [];
      }
    },

    async findOpenPullRequestsWithLabel(
      repository: string,
      label: string,
    ): Promise<PullRequestSearchResult[]> {
      try {
        const proc = Bun.spawn([
          "gh", "pr", "list",
          "--repo", repository,
          "--label", label,
          "--state", "open",
          "--json", "number,title,body,labels,author,state,headRefName,headRefOid,baseRefName,baseRefOid,isDraft",
        ], { stdout: "pipe", stderr: "pipe" });

        const stdout = await new Response(proc.stdout).text();
        await proc.exited;

        if (!stdout.trim()) return [];

        const raw = JSON.parse(stdout) as unknown[];
        return raw.map((item) => {
          const parsed = ghPrListSchema.parse(item);
          return {
            pullRequest: {
              number: parsed.number,
              title: parsed.title,
              body: parsed.body,
              head: { ref: parsed.headRefName, sha: parsed.headRefOid },
              base: { ref: parsed.baseRefName, sha: parsed.baseRefOid },
              user: { login: parsed.author.login, id: 0, avatar_url: "" },
              state: parsed.state.toLowerCase() as "open" | "closed",
              draft: parsed.isDraft,
            },
            repository: {
              id: 0,
              full_name: repository,
              clone_url: `https://github.com/${repository}.git`,
              default_branch: "main",
            },
          };
        });
      } catch (error) {
        console.error(`[recovery] Failed to search PRs in ${repository} with label "${label}":`, error);
        return [];
      }
    },
  };
}
