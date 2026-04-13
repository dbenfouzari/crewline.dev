import { describe, expect, it } from "bun:test";
import type { ConversationEvent } from "@crewline/shared";
import {
  buildStreamingClaudeArgs,
  classifyEvent,
  parseLine,
  processNdjsonStream,
  truncatePayload,
  type StreamingExecutorOptions,
} from "./streaming-executor.js";

/**
 * Creates a ReadableStream from an array of string chunks,
 * simulating how stdout delivers data in arbitrary byte boundaries.
 */
function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

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

  it("classifies as assistant:text when content array has mixed types (text first)", () => {
    const raw = {
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "Let me help" },
          { type: "tool_use", name: "read_file" },
        ],
      },
    };
    expect(classifyEvent(raw)).toBe("assistant:text");
  });

  it("classifies as assistant:tool_use when content array has tool_use first", () => {
    const raw = {
      type: "assistant",
      message: {
        content: [
          { type: "tool_use", name: "read_file" },
          { type: "text", text: "Reading..." },
        ],
      },
    };
    expect(classifyEvent(raw)).toBe("assistant:tool_use");
  });

  it("classifies as assistant:text when content array is empty", () => {
    const raw = { type: "assistant", message: { content: [] } };
    expect(classifyEvent(raw)).toBe("assistant:text");
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

describe("truncatePayload", () => {
  it("returns payload unchanged when under size limit", () => {
    const payload = { type: "assistant", message: "hello" };
    const result = truncatePayload(payload);
    expect(result).toEqual(payload);
  });

  it("truncates payload when over 64KB and adds metadata", () => {
    const largeContent = "x".repeat(70_000);
    const payload = { type: "tool", content: largeContent };
    const result = truncatePayload(payload);
    expect(result["_truncated"]).toBe(true);
    expect(typeof result["_originalSize"]).toBe("number");
    expect(result["_originalSize"] as number).toBeGreaterThan(64 * 1024);
  });

  it("returns payload unchanged at exactly the size limit", () => {
    // Build a payload whose JSON serialization is exactly 64KB
    const overhead = JSON.stringify({ type: "tool", content: "" }).length;
    const filler = "a".repeat(64 * 1024 - overhead);
    const payload = { type: "tool", content: filler };
    expect(JSON.stringify(payload).length).toBe(64 * 1024);
    const result = truncatePayload(payload);
    expect(result["_truncated"]).toBeUndefined();
    expect(result).toEqual(payload);
  });
});

describe("processNdjsonStream", () => {
  it("emits events for each valid NDJSON line", async () => {
    const lines = [
      '{"type":"system","message":"init"}\n',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"hello"}]}}\n',
    ];
    const stream = createMockStream(lines);
    const events: ConversationEvent[] = [];

    const result = await processNdjsonStream(stream, "job-1", (event) => {
      events.push(event);
    });

    expect(events).toHaveLength(2);
    expect(events[0]!.type).toBe("system");
    expect(events[1]!.type).toBe("assistant:text");
    expect(result.stdoutChunks).toHaveLength(2);
    expect(result.events).toHaveLength(2);
  });

  it("handles partial JSON lines split across chunks", async () => {
    // Split a single JSON line across two chunks
    const fullLine = '{"type":"assistant","message":{"content":[{"type":"text","text":"split test"}]}}';
    const splitPoint = Math.floor(fullLine.length / 2);
    const chunk1 = fullLine.slice(0, splitPoint);
    const chunk2 = fullLine.slice(splitPoint) + "\n";

    const stream = createMockStream([chunk1, chunk2]);
    const events: ConversationEvent[] = [];

    await processNdjsonStream(stream, "job-1", (event) => {
      events.push(event);
    });

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("assistant:text");
    expect((events[0]!.payload as Record<string, unknown>)["type"]).toBe("assistant");
  });

  it("invokes onEvent callback for each event in order", async () => {
    const lines = [
      '{"type":"system","message":"init"}\n',
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"read"}]}}\n',
      '{"type":"tool","content":"file data"}\n',
      '{"type":"result","result":"done"}\n',
    ];
    const stream = createMockStream(lines);
    const callbackOrder: string[] = [];

    await processNdjsonStream(stream, "job-1", (event) => {
      callbackOrder.push(event.type);
    });

    expect(callbackOrder).toEqual(["system", "assistant:tool_use", "tool:result", "result"]);
  });

  it("assigns monotonically increasing sequence numbers", async () => {
    const lines = [
      '{"type":"system","message":"a"}\n',
      '{"type":"system","message":"b"}\n',
      '{"type":"system","message":"c"}\n',
    ];
    const stream = createMockStream(lines);
    const events: ConversationEvent[] = [];

    await processNdjsonStream(stream, "job-1", (event) => {
      events.push(event);
    });

    expect(events[0]!.sequenceNumber).toBe(0);
    expect(events[1]!.sequenceNumber).toBe(1);
    expect(events[2]!.sequenceNumber).toBe(2);
  });

  it("sets correct jobId on all events", async () => {
    const stream = createMockStream(['{"type":"system","message":"test"}\n']);
    const events: ConversationEvent[] = [];

    await processNdjsonStream(stream, "my-job-42", (event) => {
      events.push(event);
    });

    expect(events[0]!.jobId).toBe("my-job-42");
  });

  it("skips malformed lines and continues processing", async () => {
    const lines = [
      '{"type":"system","message":"first"}\n',
      "this is not json\n",
      '{"type":"system","message":"third"}\n',
    ];
    const stream = createMockStream(lines);
    const events: ConversationEvent[] = [];

    await processNdjsonStream(stream, "job-1", (event) => {
      events.push(event);
    });

    expect(events).toHaveLength(2);
    expect(events[0]!.sequenceNumber).toBe(0);
    expect(events[1]!.sequenceNumber).toBe(1);
  });

  it("processes incomplete final line (no trailing newline)", async () => {
    // Stream that ends without a trailing newline
    const stream = createMockStream(['{"type":"result","result":"done"}']);
    const events: ConversationEvent[] = [];

    await processNdjsonStream(stream, "job-1", (event) => {
      events.push(event);
    });

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("result");
  });

  it("produces empty results for stream with no valid lines", async () => {
    const stream = createMockStream(["not json\n", "\n", "also bad\n"]);
    const events: ConversationEvent[] = [];

    const result = await processNdjsonStream(stream, "job-1", (event) => {
      events.push(event);
    });

    expect(events).toHaveLength(0);
    expect(result.stdoutChunks).toHaveLength(0);
  });

  it("assembles stdout from all valid parsed lines", async () => {
    const line1 = '{"type":"system","message":"a"}';
    const line2 = '{"type":"result","result":"b"}';
    const stream = createMockStream([`${line1}\n${line2}\n`]);
    const events: ConversationEvent[] = [];

    const result = await processNdjsonStream(stream, "job-1", (event) => {
      events.push(event);
    });

    expect(result.stdoutChunks).toEqual([line1, line2]);
  });

  it("truncates large payloads in emitted events", async () => {
    const largeContent = "x".repeat(70_000);
    const line = JSON.stringify({ type: "tool", content: largeContent });
    const stream = createMockStream([line + "\n"]);
    const events: ConversationEvent[] = [];

    await processNdjsonStream(stream, "job-1", (event) => {
      events.push(event);
    });

    expect(events).toHaveLength(1);
    expect(events[0]!.payload["_truncated"]).toBe(true);
    expect(events[0]!.payload["_originalSize"]).toBeDefined();
  });
});
