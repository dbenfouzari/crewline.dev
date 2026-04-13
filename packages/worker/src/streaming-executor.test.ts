import { describe, expect, it } from "bun:test";
import {
  buildStreamingClaudeArgs,
  classifyEvent,
  parseLine,
  type StreamingExecutorOptions,
} from "./streaming-executor.js";

describe("buildStreamingClaudeArgs", () => {
  const baseOptions: StreamingExecutorOptions = {
    prompt: "Fix the bug described in issue #1",
    workDir: "/tmp/repo",
    jobId: "job-123",
    onEvent: () => {},
  };

  it("builds streaming claude CLI args with stream-json format", () => {
    const args = buildStreamingClaudeArgs(baseOptions);
    expect(args).toContain("-p");
    expect(args).toContain("--output-format");
    expect(args).toContain("stream-json");
    expect(args).toContain("--verbose");
    expect(args).toContain("--dangerously-skip-permissions");
    expect(args).toContain("Fix the bug described in issue #1");
  });

  it("does not include --print flag", () => {
    const args = buildStreamingClaudeArgs(baseOptions);
    expect(args).not.toContain("--print");
  });
});

describe("classifyEvent", () => {
  it("classifies assistant text events", () => {
    expect(classifyEvent({ type: "assistant", message: { content: [{ type: "text" }] } })).toBe("assistant:text");
  });

  it("classifies assistant tool_use events", () => {
    expect(classifyEvent({ type: "assistant", message: { content: [{ type: "tool_use" }] } })).toBe("assistant:tool_use");
  });

  it("classifies tool result events", () => {
    expect(classifyEvent({ type: "tool", content: "result" })).toBe("tool:result");
  });

  it("classifies result events", () => {
    expect(classifyEvent({ type: "result", result: "done" })).toBe("result");
  });

  it("classifies error events", () => {
    expect(classifyEvent({ type: "error", error: "something" })).toBe("error");
  });

  it("classifies system events", () => {
    expect(classifyEvent({ type: "system", message: "init" })).toBe("system");
  });

  it("falls back to system for unknown types", () => {
    expect(classifyEvent({ type: "unknown_thing" })).toBe("system");
  });

  it("falls back to system for objects without type", () => {
    expect(classifyEvent({ data: "something" })).toBe("system");
  });
});

describe("parseLine", () => {
  it("parses valid JSON line into a record", () => {
    const result = parseLine('{"type":"assistant","message":{"content":[{"type":"text","text":"hello"}]}}');
    expect(result).not.toBeNull();
    expect(result!["type"]).toBe("assistant");
  });

  it("returns null for empty lines", () => {
    expect(parseLine("")).toBeNull();
    expect(parseLine("  ")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseLine("{not valid json")).toBeNull();
  });

  it("returns null for non-object JSON", () => {
    expect(parseLine('"just a string"')).toBeNull();
    expect(parseLine("42")).toBeNull();
    expect(parseLine("null")).toBeNull();
  });
});
