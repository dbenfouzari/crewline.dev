import { describe, expect, it } from "bun:test";
import { ZodError } from "zod";
import {
  GitHubUserSchema,
  GitHubRepositorySchema,
  GitHubIssueSchema,
  GitHubPullRequestSchema,
} from "./github.js";

describe("GitHubUserSchema", () => {
  it("parses a valid user", () => {
    const result = GitHubUserSchema.parse({
      login: "octocat",
      id: 1,
      avatar_url: "https://avatars.githubusercontent.com/u/1",
    });

    expect(result.login).toBe("octocat");
    expect(result.id).toBe(1);
    expect(result.avatar_url).toBe("https://avatars.githubusercontent.com/u/1");
  });

  it("strips extra fields", () => {
    const result = GitHubUserSchema.parse({
      login: "octocat",
      id: 1,
      avatar_url: "",
      node_id: "MDQ6VXNlcjE=",
      type: "User",
    });

    expect(result).toEqual({ login: "octocat", id: 1, avatar_url: "" });
  });

  it("rejects missing login", () => {
    expect(() => GitHubUserSchema.parse({ id: 1, avatar_url: "" })).toThrow(ZodError);
  });
});

describe("GitHubRepositorySchema", () => {
  it("parses a valid repository", () => {
    const result = GitHubRepositorySchema.parse({
      id: 42,
      full_name: "owner/repo",
      clone_url: "https://github.com/owner/repo.git",
      default_branch: "main",
    });

    expect(result.full_name).toBe("owner/repo");
  });

  it("rejects missing full_name", () => {
    expect(() =>
      GitHubRepositorySchema.parse({ id: 42, clone_url: "", default_branch: "main" }),
    ).toThrow(ZodError);
  });
});

describe("GitHubIssueSchema", () => {
  const validIssue = {
    number: 5,
    title: "Bug report",
    body: "Something is broken",
    labels: [{ id: 1, name: "bug", color: "d73a4a" }],
    user: { login: "octocat", id: 1, avatar_url: "" },
    state: "open",
  };

  it("parses a valid issue", () => {
    const result = GitHubIssueSchema.parse(validIssue);

    expect(result.number).toBe(5);
    expect(result.title).toBe("Bug report");
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0]!.name).toBe("bug");
  });

  it("rejects missing number", () => {
    const { number: _, ...noNumber } = validIssue;
    expect(() => GitHubIssueSchema.parse(noNumber)).toThrow(ZodError);
  });

  it("rejects non-integer number", () => {
    expect(() => GitHubIssueSchema.parse({ ...validIssue, number: "five" })).toThrow(ZodError);
  });

  it("accepts null body", () => {
    const result = GitHubIssueSchema.parse({ ...validIssue, body: null });
    expect(result.body).toBeNull();
  });

  it("strips extra fields from GitHub API response", () => {
    const result = GitHubIssueSchema.parse({
      ...validIssue,
      node_id: "MDU6SXNzdWUx",
      html_url: "https://github.com/owner/repo/issues/5",
      pull_request: null,
    });

    expect(result).not.toHaveProperty("node_id");
    expect(result).not.toHaveProperty("html_url");
  });
});

describe("GitHubPullRequestSchema", () => {
  const validPullRequest = {
    number: 42,
    title: "Add feature",
    body: "This adds a feature",
    head: { ref: "feat/test", sha: "abc123" },
    base: { ref: "main", sha: "def456" },
    user: { login: "octocat", id: 1, avatar_url: "" },
    state: "open",
    draft: false,
  };

  it("parses a valid pull request", () => {
    const result = GitHubPullRequestSchema.parse(validPullRequest);

    expect(result.number).toBe(42);
    expect(result.head.ref).toBe("feat/test");
    expect(result.draft).toBe(false);
  });

  it("rejects missing number", () => {
    const { number: _, ...noNumber } = validPullRequest;
    expect(() => GitHubPullRequestSchema.parse(noNumber)).toThrow(ZodError);
  });

  it("defaults head and base when missing (Issues API does not return PR branch details)", () => {
    const result = GitHubPullRequestSchema.parse({
      number: 42,
      title: "Add feature",
      body: null,
      user: { login: "octocat", id: 1, avatar_url: "" },
      state: "open",
      draft: false,
    });

    expect(result.head).toEqual({ ref: "", sha: "" });
    expect(result.base).toEqual({ ref: "", sha: "" });
  });

  it("defaults draft to false when missing", () => {
    const { draft: _, ...noDraft } = validPullRequest;
    const result = GitHubPullRequestSchema.parse(noDraft);
    expect(result.draft).toBe(false);
  });

  it("strips extra fields", () => {
    const result = GitHubPullRequestSchema.parse({
      ...validPullRequest,
      node_id: "MDExOlB1bGxSZXF1ZXN0MQ==",
      merged: false,
    });

    expect(result).not.toHaveProperty("node_id");
    expect(result).not.toHaveProperty("merged");
  });
});
