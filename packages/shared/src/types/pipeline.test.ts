import { describe, expect, it } from "bun:test";
import { buildPipelineLabels } from "./pipeline.js";
import type { AgentConfig } from "./agent.js";

const agents: Record<string, AgentConfig> = {
  requirementsGatherer: {
    name: "Requirements Gatherer",
    trigger: { event: "issues.labeled", label: "ready" },
    prompt: "Gather requirements",
  },
  architect: {
    name: "Architect",
    trigger: { event: "issues.labeled", label: "ready-for-architecture" },
    prompt: "Design architecture",
  },
  testMaster: {
    name: "Test Master",
    trigger: { event: "pull_request.labeled", label: "ready-for-test" },
    prompt: "Review tests",
  },
};

describe("buildPipelineLabels", () => {
  it("derives pipeline labels from agent config", () => {
    const labels = buildPipelineLabels(agents);

    expect(labels).toHaveLength(3);
  });

  it("maps issue-triggered agents to entity type 'issue'", () => {
    const labels = buildPipelineLabels(agents);
    const reqLabel = labels.find((l) => l.agentKey === "requirementsGatherer");

    expect(reqLabel).toBeDefined();
    expect(reqLabel!.label).toBe("ready");
    expect(reqLabel!.entityType).toBe("issue");
  });

  it("maps pull_request-triggered agents to entity type 'pull_request'", () => {
    const labels = buildPipelineLabels(agents);
    const testLabel = labels.find((l) => l.agentKey === "testMaster");

    expect(testLabel).toBeDefined();
    expect(testLabel!.label).toBe("ready-for-test");
    expect(testLabel!.entityType).toBe("pull_request");
  });

  it("skips agents without a trigger label", () => {
    const agentsWithNoLabel: Record<string, AgentConfig> = {
      prOpened: {
        name: "PR Opened",
        trigger: { event: "pull_request.opened" },
        prompt: "Review PR",
      },
    };

    const labels = buildPipelineLabels(agentsWithNoLabel);

    expect(labels).toHaveLength(0);
  });

  it("returns empty array for empty agents config", () => {
    const labels = buildPipelineLabels({});

    expect(labels).toHaveLength(0);
  });
});
