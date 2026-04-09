import { describe, expect, it } from "bun:test";
import { defineConfig } from "./define-config.js";

describe("defineConfig", () => {
  it("returns a validated config object", () => {
    const config = defineConfig({
      github: {
        webhookSecret: "whsec_test",
        repos: ["user/repo"],
      },
      agents: {
        dev: {
          name: "Dev",
          trigger: { event: "issues.labeled", label: "ready" },
          prompt: "Code it",
        },
      },
      board: {
        columns: ["Backlog", "Done"],
      },
    });

    expect(config.github.webhookSecret).toBe("whsec_test");
    expect(config.agents["dev"]?.name).toBe("Dev");
    expect(config.board.columns).toHaveLength(2);
  });

  it("throws on invalid config", () => {
    expect(() =>
      defineConfig({
        github: { webhookSecret: "", repos: [] },
        agents: {},
        board: { columns: [] },
      })
    ).toThrow();
  });
});
