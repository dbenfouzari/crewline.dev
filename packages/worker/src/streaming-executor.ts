/**
 * Streaming executor: spawns Claude Code CLI with stream-json output
 * and emits ConversationEvents in real-time via an onEvent callback.
 * Preserves backward-compatible ExecutorResult for existing consumers.
 */

import type { ConversationEvent, ConversationEventType } from "@crewline/shared";
import type { ExecutorResult } from "./executor.js";

/** Maximum payload size in bytes before truncation for persistence (64KB) */
const MAX_PAYLOAD_SIZE = 64 * 1024;

export interface StreamingExecutorOptions {
  prompt: string;
  workDir: string;
  jobId: string;
  onEvent: (event: ConversationEvent) => void;
}

/**
 * Builds Claude CLI arguments for streaming JSON output.
 *
 * @param options - The streaming executor options
 * @returns Array of CLI arguments
 */
export function buildStreamingClaudeArgs(options: StreamingExecutorOptions): string[] {
  return [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--dangerously-skip-permissions",
    options.prompt,
  ];
}

/**
 * Classifies a raw Claude CLI JSON event into a ConversationEventType.
 * Best-effort mapping — unknown types fall back to "system".
 *
 * @param raw - The parsed JSON object from Claude CLI
 * @returns The classified event type
 */
export function classifyEvent(raw: Record<string, unknown>): ConversationEventType {
  const type = raw["type"];

  if (type === "assistant") {
    const message = raw["message"] as { content?: { type?: string }[] } | undefined;
    const contentType = message?.content?.[0]?.type;
    if (contentType === "tool_use") return "assistant:tool_use";
    return "assistant:text";
  }

  if (type === "tool") return "tool:result";
  if (type === "result") return "result";
  if (type === "error") return "error";
  if (type === "system") return "system";

  return "system";
}

/**
 * Parses a single NDJSON line. Returns null for empty, malformed, or non-object lines.
 *
 * @param line - A single line from the NDJSON stream
 * @returns The parsed JSON object, or null if unparseable
 */
export function parseLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (trimmed === "") return null;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Truncates a payload object if its JSON representation exceeds MAX_PAYLOAD_SIZE.
 * Preserves the event type for classification but replaces all other content
 * with truncation metadata to actually reduce storage size.
 *
 * @param payload - The raw event payload
 * @returns The payload, or a truncated summary if oversized
 */
export function truncatePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(payload);
  if (json.length <= MAX_PAYLOAD_SIZE) return payload;

  return {
    type: payload["type"],
    _truncated: true,
    _originalSize: json.length,
  };
}

/**
 * Result of processing an NDJSON stream of conversation events.
 */
export interface StreamProcessorResult {
  /** Raw NDJSON lines that were successfully parsed */
  stdoutChunks: string[];
  /** All emitted conversation events in order */
  events: ConversationEvent[];
}

/**
 * Processes a ReadableStream of NDJSON bytes, parsing each line and emitting
 * ConversationEvents in real-time via the onEvent callback.
 *
 * @param stream - A ReadableStream of Uint8Array chunks (e.g., from stdout)
 * @param jobId - The job ID to associate events with
 * @param onEvent - Callback invoked for each parsed conversation event
 * @returns The accumulated stdout chunks and events
 */
export async function processNdjsonStream(
  stream: ReadableStream<Uint8Array>,
  jobId: string,
  onEvent: (event: ConversationEvent) => void,
): Promise<StreamProcessorResult> {
  let sequenceNumber = 0;
  const stdoutChunks: string[] = [];
  const events: ConversationEvent[] = [];

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const parsed = parseLine(line);
        if (!parsed) continue;

        stdoutChunks.push(line);
        const eventType = classifyEvent(parsed);

        const event: ConversationEvent = {
          id: crypto.randomUUID(),
          jobId,
          type: eventType,
          payload: truncatePayload(parsed),
          sequenceNumber: sequenceNumber++,
          timestamp: new Date().toISOString(),
        };

        events.push(event);
        onEvent(event);
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const parsed = parseLine(buffer);
      if (parsed) {
        stdoutChunks.push(buffer);
        const eventType = classifyEvent(parsed);
        const event: ConversationEvent = {
          id: crypto.randomUUID(),
          jobId,
          type: eventType,
          payload: truncatePayload(parsed),
          sequenceNumber: sequenceNumber++,
          timestamp: new Date().toISOString(),
        };
        events.push(event);
        onEvent(event);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { stdoutChunks, events };
}

/**
 * Executes an agent using Claude CLI with streaming JSON output.
 * Emits ConversationEvents in real-time via the onEvent callback.
 * Assembles a backward-compatible ExecutorResult from streamed events.
 *
 * @param options - Streaming executor options including jobId and onEvent callback
 * @returns The assembled ExecutorResult (exitCode, stdout, stderr)
 */
export async function executeAgentStreaming(
  options: StreamingExecutorOptions,
): Promise<ExecutorResult> {
  const args = buildStreamingClaudeArgs(options);
  const proc = Bun.spawn(["claude", ...args], {
    cwd: options.workDir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const { stdoutChunks } = await processNdjsonStream(
    proc.stdout,
    options.jobId,
    options.onEvent,
  );

  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return {
    exitCode,
    stdout: stdoutChunks.join("\n"),
    stderr,
  };
}
