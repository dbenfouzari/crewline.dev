import { describe, expect, it } from "bun:test";
import { configSchema } from "./schema.js";

describe("configSchema", () => {
  const validConfig = {
    github: {
      webhookSecret: "whsec_test123",
      repos: ["user/my-app"],
    },
    agents: {
      dev: {
        name: "Dev Agent",
        trigger: { event: "issues.labeled", label: "ready" },
        prompt: "Tu es un développeur senior...",
        onSuccess: { moveTo: "Review Dev" },
      },
      techLead: {
        name: "Tech Lead Agent",
        trigger: { event: "pull_request.opened" },
        prompt: "Tu es un tech lead exigeant...",
        onSuccess: { moveTo: "Review PO" },
        onFailure: { moveTo: "In Progress", comment: true },
      },
    },
    board: {
      columns: ["Backlog", "In Progress", "Review Dev", "Review PO", "Done"],
    },
  };

  it("accepts a valid config", () => {
    const result = configSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it("rejects missing webhookSecret", () => {
    const invalid = {
      ...validConfig,
      github: { repos: ["user/my-app"] },
    };
    const result = configSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects empty repos array", () => {
    const invalid = {
      ...validConfig,
      github: { ...validConfig.github, repos: [] },
    };
    const result = configSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects empty agents", () => {
    const invalid = {
      ...validConfig,
      agents: {},
    };
    const result = configSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid trigger event format", () => {
    const invalid = {
      ...validConfig,
      agents: {
        dev: {
          ...validConfig.agents.dev,
          trigger: { event: "invalid" },
        },
      },
    };
    const result = configSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("requires at least 2 board columns", () => {
    const invalid = {
      ...validConfig,
      board: { columns: ["Done"] },
    };
    const result = configSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts config without optional agent actions", () => {
    const minimal = {
      ...validConfig,
      agents: {
        dev: {
          name: "Dev",
          trigger: { event: "issues.labeled", label: "ready" },
          prompt: "Code it",
        },
      },
    };
    const result = configSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});
