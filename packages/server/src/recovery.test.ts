import { describe, expect, it } from "bun:test";
import { recoverPendingWork } from "./recovery.js";
import type { GitHubSearchClient, IssueSearchResult, PullRequestSearchResult } from "./github-search-client.js";
import type { AgentConfig, CrewlineConfig, NewJob } from "@crewline/shared";

/** Creates a mock queue that records enqueued jobs. */
function createMockQueue() {
  const enqueued: NewJob[] = [];
  const activeKeys = new Set<string>();

  return {
    queue: {
      async enqueue(job: NewJob): Promise<string> {
        enqueued.push(job);
        return `job-${String(enqueued.length)}`;
      },
      async getActiveJobKeys(): Promise<Set<string>> {
        return activeKeys;
      },
    },
    enqueued,
    activeKeys,
  };
}

/** Creates a mock GitHub search client with configurable responses. */
function createMockGitHubClient(
  issueResults: Record<string, IssueSearchResult[]> = {},
  pullRequestResults: Record<string, PullRequestSearchResult[]> = {},
): GitHubSearchClient {
  return {
    async findOpenIssuesWithLabel(repository, label) {
      return issueResults[`${repository}:${label}`] ?? [];
    },
    async findOpenPullRequestsWithLabel(repository, label) {
      return pullRequestResults[`${repository}:${label}`] ?? [];
    },
  };
}

function createIssueResult(number: number, labels: string[]): IssueSearchResult {
  return {
    issue: {
      number,
      title: `Issue #${String(number)}`,
      body: "body",
      labels: labels.map((name, index) => ({ id: index + 1, name, color: "000" })),
      user: { login: "u", id: 1, avatar_url: "" },
      state: "open",
    },
    repository: {
      id: 1,
      full_name: "owner/repo",
      clone_url: "https://github.com/owner/repo.git",
      default_branch: "main",
    },
  };
}

function createPullRequestResult(number: number): PullRequestSearchResult {
  return {
    pullRequest: {
      number,
      title: `PR #${String(number)}`,
      body: "body",
      head: { ref: "feat/test", sha: "abc" },
      base: { ref: "main", sha: "def" },
      user: { login: "u", id: 1, avatar_url: "" },
      state: "open",
      draft: false,
    },
    repository: {
      id: 1,
      full_name: "owner/repo",
      clone_url: "https://github.com/owner/repo.git",
      default_branch: "main",
    },
  };
}

const testAgents: Record<string, AgentConfig> = {
  requirementsGatherer: {
    name: "Requirements Gatherer",
    trigger: { event: "issues.labeled", label: "ready" },
    prompt: "Gather requirements",
  },
  architect: {
    name: "Architect",
    trigger: { event: "issues.labeled", label: "ready-for-architecture" },
    prompt: "Design",
  },
  dev: {
    name: "Dev",
    trigger: { event: "issues.labeled", label: "ready-for-dev" },
    prompt: "Implement",
  },
  testMaster: {
    name: "Test Master",
    trigger: { event: "pull_request.labeled", label: "ready-for-test" },
    prompt: "Test",
  },
  techLead: {
    name: "Tech Lead",
    trigger: { event: "pull_request.labeled", label: "ready-for-review" },
    prompt: "Review",
  },
};

const testConfig: CrewlineConfig = {
  github: {
    webhookSecret: "secret",
    repos: ["owner/repo"],
  },
  agents: testAgents,
  board: { columns: [] },
};

describe("recoverPendingWork", () => {
  it("recovers an issue with a pipeline label", async () => {
    const { queue, enqueued } = createMockQueue();
    const client = createMockGitHubClient({
      "owner/repo:ready": [createIssueResult(5, ["ready"])],
    });

    const count = await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    expect(count).toBe(1);
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]!.agentName).toBe("requirementsGatherer");
    expect(enqueued[0]!.repository).toBe("owner/repo");
    expect(enqueued[0]!.targetNumber).toBe(5);
  });

  it("recovers a PR with a pipeline label", async () => {
    const { queue, enqueued } = createMockQueue();
    const client = createMockGitHubClient({}, {
      "owner/repo:ready-for-test": [createPullRequestResult(42)],
    });

    const count = await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    expect(count).toBe(1);
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]!.agentName).toBe("testMaster");
    expect(enqueued[0]!.targetNumber).toBe(42);
  });

  it("returns 0 when no pending work is found", async () => {
    const { queue } = createMockQueue();
    const client = createMockGitHubClient();

    const count = await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    expect(count).toBe(0);
  });

  it("deduplicates against jobs already in the queue", async () => {
    const { queue, enqueued, activeKeys } = createMockQueue();
    activeKeys.add("requirementsGatherer:owner/repo:5");

    const client = createMockGitHubClient({
      "owner/repo:ready": [createIssueResult(5, ["ready"])],
    });

    const count = await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    expect(count).toBe(0);
    expect(enqueued).toHaveLength(0);
  });

  it("recovers multiple items across repos and labels", async () => {
    const multiRepoConfig: CrewlineConfig = {
      ...testConfig,
      github: { ...testConfig.github, repos: ["owner/repo", "owner/other"] },
    };

    const { queue, enqueued } = createMockQueue();
    const client = createMockGitHubClient({
      "owner/repo:ready": [createIssueResult(1, ["ready"])],
      "owner/other:ready-for-dev": [createIssueResult(3, ["ready-for-dev"])],
    });

    const count = await recoverPendingWork({ config: multiRepoConfig, queue, githubClient: client });

    expect(count).toBe(2);
    expect(enqueued).toHaveLength(2);
  });

  it("enqueues only the furthest-along label when item has multiple pipeline labels", async () => {
    const { queue, enqueued } = createMockQueue();
    // Issue #10 has both "ready" (requirementsGatherer, priority 6) and "ready-for-dev" (dev, priority 3)
    // It should only enqueue the furthest-along: dev (priority 3)
    const client = createMockGitHubClient({
      "owner/repo:ready": [createIssueResult(10, ["ready", "ready-for-dev"])],
      "owner/repo:ready-for-dev": [createIssueResult(10, ["ready", "ready-for-dev"])],
    });

    const count = await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    expect(count).toBe(1);
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]!.agentName).toBe("dev");
  });

  it("constructs synthetic payload with correct structure for issues", async () => {
    const { queue, enqueued } = createMockQueue();
    const client = createMockGitHubClient({
      "owner/repo:ready": [createIssueResult(5, ["ready"])],
    });

    await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    const payload = JSON.parse(enqueued[0]!.payload) as Record<string, unknown>;
    expect(payload["action"]).toBe("labeled");
    expect((payload["label"] as { name: string }).name).toBe("ready");
    expect((payload["issue"] as { number: number }).number).toBe(5);
    expect((payload["repository"] as { full_name: string }).full_name).toBe("owner/repo");
    expect((payload["repository"] as { clone_url: string }).clone_url).toBe("https://github.com/owner/repo.git");
  });

  it("constructs synthetic payload with correct structure for PRs", async () => {
    const { queue, enqueued } = createMockQueue();
    const client = createMockGitHubClient({}, {
      "owner/repo:ready-for-test": [createPullRequestResult(42)],
    });

    await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    const payload = JSON.parse(enqueued[0]!.payload) as Record<string, unknown>;
    expect(payload["action"]).toBe("labeled");
    expect((payload["label"] as { name: string }).name).toBe("ready-for-test");
    expect((payload["pull_request"] as { number: number }).number).toBe(42);
    expect((payload["repository"] as { full_name: string }).full_name).toBe("owner/repo");
  });

  it("skips labels with no matching agent in config", async () => {
    const limitedConfig: CrewlineConfig = {
      ...testConfig,
      agents: {
        requirementsGatherer: testAgents["requirementsGatherer"]!,
      },
    };

    const { queue, enqueued } = createMockQueue();
    // Only "ready" label has a matching agent; "ready-for-dev" does not
    const client = createMockGitHubClient({
      "owner/repo:ready": [createIssueResult(5, ["ready"])],
    });

    const count = await recoverPendingWork({ config: limitedConfig, queue, githubClient: client });

    expect(count).toBe(1);
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]!.agentName).toBe("requirementsGatherer");
  });

  it("skips recovery candidates with invalid targetNumber and logs a warning", async () => {
    const { queue, enqueued } = createMockQueue();
    // Return an issue result where number is undefined at runtime (simulating a bad API response)
    const badResult = createIssueResult(5, ["ready"]);
    // Force number to undefined to simulate the bug
    (badResult.issue as unknown as Record<string, unknown>)["number"] = undefined;

    const client = createMockGitHubClient({
      "owner/repo:ready": [badResult],
    });

    const count = await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    expect(count).toBe(0);
    expect(enqueued).toHaveLength(0);
  });

  it("skips recovery candidates with zero targetNumber", async () => {
    const { queue, enqueued } = createMockQueue();
    const badResult = createIssueResult(5, ["ready"]);
    (badResult.issue as unknown as Record<string, unknown>)["number"] = 0;

    const client = createMockGitHubClient({
      "owner/repo:ready": [badResult],
    });

    const count = await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    expect(count).toBe(0);
    expect(enqueued).toHaveLength(0);
  });

  it("passes targetTitle extracted from issue payload when re-enqueueing", async () => {
    const { queue, enqueued } = createMockQueue();
    const client = createMockGitHubClient({
      "owner/repo:ready": [createIssueResult(5, ["ready"])],
    });

    await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]!.targetTitle).toBe("Issue #5");
  });

  it("passes targetTitle extracted from PR payload when re-enqueueing", async () => {
    const { queue, enqueued } = createMockQueue();
    const client = createMockGitHubClient({}, {
      "owner/repo:ready-for-test": [createPullRequestResult(42)],
    });

    await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]!.targetTitle).toBe("PR #42");
  });

  it("continues recovery when GitHub client fails for one label", async () => {
    const { queue, enqueued } = createMockQueue();
    const client: GitHubSearchClient = {
      async findOpenIssuesWithLabel(_repository, label) {
        if (label === "ready") throw new Error("API error");
        if (label === "ready-for-dev") return [createIssueResult(3, ["ready-for-dev"])];
        return [];
      },
      async findOpenPullRequestsWithLabel() {
        return [];
      },
    };

    const count = await recoverPendingWork({ config: testConfig, queue, githubClient: client });

    expect(count).toBe(1);
    expect(enqueued[0]!.agentName).toBe("dev");
  });
});
