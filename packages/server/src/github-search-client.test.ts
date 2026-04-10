import { describe, expect, it } from "bun:test";
import type { GitHubSearchClient } from "./github-search-client.js";
import type { GitHubIssue, GitHubPullRequest, GitHubRepository } from "@crewline/shared";

/**
 * These tests verify the GitHubSearchClient interface contract.
 * Real implementations use `gh api` CLI; tests use a mock.
 */

function createMockRepository(fullName: string): GitHubRepository {
  return {
    id: 1,
    full_name: fullName,
    clone_url: `https://github.com/${fullName}.git`,
    default_branch: "main",
  };
}

function createMockIssue(number: number, labels: string[]): GitHubIssue {
  return {
    number,
    title: `Issue #${String(number)}`,
    body: "test body",
    labels: labels.map((name, index) => ({ id: index + 1, name, color: "000000" })),
    user: { login: "testuser", id: 1, avatar_url: "" },
    state: "open",
  };
}

function createMockPullRequest(number: number): GitHubPullRequest {
  return {
    number,
    title: `PR #${String(number)}`,
    body: "test body",
    head: { ref: "feat/test", sha: "abc123" },
    base: { ref: "main", sha: "def456" },
    user: { login: "testuser", id: 1, avatar_url: "" },
    state: "open",
    draft: false,
  };
}

describe("GitHubSearchClient", () => {
  it("findOpenIssuesWithLabel returns matching issues", async () => {
    const client: GitHubSearchClient = {
      findOpenIssuesWithLabel: async (_repository, _label) => [
        { issue: createMockIssue(5, ["ready"]), repository: createMockRepository("owner/repo") },
      ],
      findOpenPullRequestsWithLabel: async () => [],
    };

    const results = await client.findOpenIssuesWithLabel("owner/repo", "ready");

    expect(results).toHaveLength(1);
    expect(results[0]!.issue.number).toBe(5);
    expect(results[0]!.repository.full_name).toBe("owner/repo");
  });

  it("findOpenPullRequestsWithLabel returns matching PRs", async () => {
    const client: GitHubSearchClient = {
      findOpenIssuesWithLabel: async () => [],
      findOpenPullRequestsWithLabel: async (_repository, _label) => [
        { pullRequest: createMockPullRequest(42), repository: createMockRepository("owner/repo") },
      ],
    };

    const results = await client.findOpenPullRequestsWithLabel("owner/repo", "ready-for-test");

    expect(results).toHaveLength(1);
    expect(results[0]!.pullRequest.number).toBe(42);
    expect(results[0]!.repository.clone_url).toBe("https://github.com/owner/repo.git");
  });

  it("returns empty arrays when no items match", async () => {
    const client: GitHubSearchClient = {
      findOpenIssuesWithLabel: async () => [],
      findOpenPullRequestsWithLabel: async () => [],
    };

    const issues = await client.findOpenIssuesWithLabel("owner/repo", "nonexistent");
    const pullRequests = await client.findOpenPullRequestsWithLabel("owner/repo", "nonexistent");

    expect(issues).toHaveLength(0);
    expect(pullRequests).toHaveLength(0);
  });
});
