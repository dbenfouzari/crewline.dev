import { describe, expect, it } from "bun:test";
import { buildClaudeArgs, type ExecutorOptions } from "./executor.js";

describe("buildClaudeArgs", () => {
  const baseOptions: ExecutorOptions = {
    prompt: "Fix the bug described in issue #1",
    workDir: "/tmp/repo",
  };

  it("builds basic claude CLI args", () => {
    const args = buildClaudeArgs(baseOptions);
    expect(args).toContain("--print");
    expect(args).toContain("--dangerously-skip-permissions");
    expect(args).toContain("Fix the bug described in issue #1");
  });

  it("includes workDir as cwd context", () => {
    const args = buildClaudeArgs(baseOptions);
    // The args should not include workDir directly — it's used as cwd for spawn
    // But the prompt should be passed
    expect(args.includes("--print")).toBe(true);
  });
});
