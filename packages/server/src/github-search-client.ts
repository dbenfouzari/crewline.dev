/**
 * GitHub search client for finding open issues and PRs by label.
 * Used during recovery to discover pending pipeline work.
 */

import type {
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepository,
} from "@crewline/shared";
import { GitHubIssueSchema, GitHubPullRequestSchema } from "@crewline/shared";

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
 * Interface-based for testability — tests inject a mock, production uses `gh api`.
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
 * Creates a GitHubSearchClient that uses the `gh api` CLI.
 * Requires `gh` CLI to be authenticated in the environment.
 */
export function createGitHubSearchClient(): GitHubSearchClient {
  return {
    async findOpenIssuesWithLabel(
      repository: string,
      label: string,
    ): Promise<IssueSearchResult[]> {
      try {
        const process = Bun.spawn([
          "gh", "api",
          `/repos/${repository}/issues`,
          "--jq", `.[] | select(.pull_request == null)`,
          "--paginate",
          "-f", `labels=${label}`,
          "-f", "state=open",
        ], { stdout: "pipe", stderr: "pipe" });

        const stdout = await new Response(process.stdout).text();
        await process.exited;

        if (!stdout.trim()) return [];

        const items = stdout.trim().split("\n").filter(Boolean).map((line) => GitHubIssueSchema.parse(JSON.parse(line)));

        return items.map((issue) => ({
          issue,
          repository: {
            id: 0,
            full_name: repository,
            clone_url: `https://github.com/${repository}.git`,
            default_branch: "main",
          },
        }));
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
        const process = Bun.spawn([
          "gh", "api",
          `/repos/${repository}/issues`,
          "--jq", `.[] | select(.pull_request != null)`,
          "--paginate",
          "-f", `labels=${label}`,
          "-f", "state=open",
        ], { stdout: "pipe", stderr: "pipe" });

        const stdout = await new Response(process.stdout).text();
        await process.exited;

        if (!stdout.trim()) return [];

        const items = stdout.trim().split("\n").filter(Boolean).map((line) => GitHubPullRequestSchema.parse(JSON.parse(line)));

        return items.map((pullRequest) => ({
          pullRequest,
          repository: {
            id: 0,
            full_name: repository,
            clone_url: `https://github.com/${repository}.git`,
            default_branch: "main",
          },
        }));
      } catch (error) {
        console.error(`[recovery] Failed to search PRs in ${repository} with label "${label}":`, error);
        return [];
      }
    },
  };
}
