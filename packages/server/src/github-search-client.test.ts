import { describe, expect, it } from "bun:test";
import type { GitHubSearchClient } from "./github-search-client.js";
import type { GitHubIssue, GitHubPullRequest, GitHubRepository } from "@crewline/shared";
import { GitHubIssueSchema, GitHubPullRequestSchema } from "@crewline/shared";
import { ZodError } from "zod";

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

describe("Zod validation of GitHub API responses", () => {
  it("rejects an issue with missing number field", () => {
    const malformed = {
      title: "Bug",
      body: "broken",
      labels: [],
      user: { login: "u", id: 1, avatar_url: "" },
      state: "open",
    };

    expect(() => GitHubIssueSchema.parse(malformed)).toThrow(ZodError);
  });

  it("rejects a PR with missing number field", () => {
    const malformed = {
      title: "Fix",
      body: null,
      user: { login: "u", id: 1, avatar_url: "" },
      state: "open",
    };

    expect(() => GitHubPullRequestSchema.parse(malformed)).toThrow(ZodError);
  });

  it("parses an issue with extra fields from GitHub API", () => {
    const apiResponse = {
      number: 5,
      title: "Bug",
      body: "broken",
      labels: [{ id: 1, name: "bug", color: "d73a4a", default: false, description: "" }],
      user: { login: "u", id: 1, avatar_url: "", node_id: "MDQ6VXNlcjE=" },
      state: "open",
      node_id: "MDU6SXNzdWUx",
      html_url: "https://github.com/owner/repo/issues/5",
      pull_request: null,
    };

    const result = GitHubIssueSchema.parse(apiResponse);
    expect(result.number).toBe(5);
  });

  it("defaults head/base for PR parsed from Issues API (no branch details)", () => {
    const issuesApiPullRequest = {
      number: 42,
      title: "Fix",
      body: null,
      user: { login: "u", id: 1, avatar_url: "" },
      state: "open",
      draft: false,
      node_id: "MDExOlB1bGxSZXF1ZXN0MQ==",
    };

    const result = GitHubPullRequestSchema.parse(issuesApiPullRequest);
    expect(result.number).toBe(42);
    expect(result.head).toEqual({ ref: "", sha: "" });
    expect(result.base).toEqual({ ref: "", sha: "" });
  });
});
