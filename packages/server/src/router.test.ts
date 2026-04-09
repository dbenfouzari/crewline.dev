import { describe, expect, it } from "bun:test";
import { matchAgents } from "./router.js";
import type { AgentConfig } from "@crewline/shared";

const devAgent: AgentConfig = {
  name: "Dev Agent",
  trigger: { event: "issues.labeled", label: "ready" },
  prompt: "Fix the issue",
  onSuccess: { moveTo: "Review Dev" },
};

const techLeadAgent: AgentConfig = {
  name: "Tech Lead Agent",
  trigger: { event: "pull_request.opened" },
  prompt: "Review the PR",
  onSuccess: { moveTo: "Review PO" },
  onFailure: { moveTo: "In Progress", comment: true },
};

const agents: Record<string, AgentConfig> = {
  dev: devAgent,
  techLead: techLeadAgent,
};

describe("matchAgents", () => {
  it("matches issues.labeled with correct label", () => {
    const matches = matchAgents(agents, "issues", {
      action: "labeled",
      label: { id: 1, name: "ready", color: "000" },
      issue: { number: 1, title: "Bug", body: "", labels: [], user: { login: "u", id: 1, avatar_url: "" }, state: "open" },
      repository: { id: 1, full_name: "user/repo", clone_url: "", default_branch: "main" },
      sender: { login: "u", id: 1, avatar_url: "" },
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]![0]).toBe("dev");
    expect(matches[0]![1].name).toBe("Dev Agent");
  });

  it("does not match issues.labeled with wrong label", () => {
    const matches = matchAgents(agents, "issues", {
      action: "labeled",
      label: { id: 2, name: "bug", color: "f00" },
      issue: { number: 1, title: "Bug", body: "", labels: [], user: { login: "u", id: 1, avatar_url: "" }, state: "open" },
      repository: { id: 1, full_name: "user/repo", clone_url: "", default_branch: "main" },
      sender: { login: "u", id: 1, avatar_url: "" },
    });

    expect(matches).toHaveLength(0);
  });

  it("does not match issues.opened against issues.labeled trigger", () => {
    const matches = matchAgents(agents, "issues", {
      action: "opened",
      issue: { number: 1, title: "Bug", body: "", labels: [], user: { login: "u", id: 1, avatar_url: "" }, state: "open" },
      repository: { id: 1, full_name: "user/repo", clone_url: "", default_branch: "main" },
      sender: { login: "u", id: 1, avatar_url: "" },
    });

    expect(matches).toHaveLength(0);
  });

  it("matches pull_request.opened", () => {
    const matches = matchAgents(agents, "pull_request", {
      action: "opened",
      pull_request: {
        number: 42, title: "Fix", body: "", state: "open", draft: false,
        head: { ref: "fix/bug", sha: "abc" }, base: { ref: "main", sha: "def" },
        user: { login: "u", id: 1, avatar_url: "" },
      },
      repository: { id: 1, full_name: "user/repo", clone_url: "", default_branch: "main" },
      sender: { login: "u", id: 1, avatar_url: "" },
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]![0]).toBe("techLead");
  });

  it("returns multiple matches if multiple agents match", () => {
    const doubleAgents: Record<string, AgentConfig> = {
      a: { name: "A", trigger: { event: "issues.labeled", label: "ready" }, prompt: "do A" },
      b: { name: "B", trigger: { event: "issues.labeled", label: "ready" }, prompt: "do B" },
    };

    const matches = matchAgents(doubleAgents, "issues", {
      action: "labeled",
      label: { id: 1, name: "ready", color: "000" },
      issue: { number: 1, title: "X", body: "", labels: [], user: { login: "u", id: 1, avatar_url: "" }, state: "open" },
      repository: { id: 1, full_name: "user/repo", clone_url: "", default_branch: "main" },
      sender: { login: "u", id: 1, avatar_url: "" },
    });

    expect(matches).toHaveLength(2);
  });

  it("returns empty array for unknown event", () => {
    const matches = matchAgents(agents, "ping" as never, {});
    expect(matches).toHaveLength(0);
  });
});
