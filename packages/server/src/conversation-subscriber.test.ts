import { describe, expect, it } from "bun:test";
import type { ConversationEvent } from "@crewline/shared";
import {
  CONVERSATION_CHANNEL_PATTERN,
  parseConversationMessage,
} from "./conversation-subscriber.js";

function makeEvent(overrides: Partial<ConversationEvent> = {}): ConversationEvent {
  return {
    id: "evt-1",
    jobId: "job-42",
    type: "system",
    payload: { type: "system", message: "init" },
    sequenceNumber: 0,
    timestamp: "2026-04-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("ConversationSubscriber", () => {
  describe("CONVERSATION_CHANNEL_PATTERN", () => {
    it("uses a pattern that matches all conversation channels", () => {
      expect(CONVERSATION_CHANNEL_PATTERN).toBe("crewline:conversation:*");
    });
  });

  describe("parseConversationMessage", () => {
    it("parses a valid serialized ConversationEvent", () => {
      const event = makeEvent({ id: "evt-5", type: "assistant:text" });
      const message = JSON.stringify(event);

      const result = parseConversationMessage(message);

      expect(result).not.toBeNull();
      expect(result!.id).toBe("evt-5");
      expect(result!.type).toBe("assistant:text");
      expect(result!.jobId).toBe("job-42");
    });

    it("returns null for malformed JSON", () => {
      expect(parseConversationMessage("{not valid")).toBeNull();
    });

    it("returns null for non-object JSON", () => {
      expect(parseConversationMessage('"just a string"')).toBeNull();
      expect(parseConversationMessage("42")).toBeNull();
      expect(parseConversationMessage("null")).toBeNull();
    });

    it("preserves all event fields through serialization round-trip", () => {
      const event = makeEvent({
        id: "evt-99",
        jobId: "job-7",
        type: "tool:result",
        payload: { type: "tool", content: "file data here" },
        sequenceNumber: 12,
        timestamp: "2026-04-13T12:30:00.000Z",
      });

      const result = parseConversationMessage(JSON.stringify(event));

      expect(result).toEqual(event);
    });

    it("handles events with complex nested payloads", () => {
      const event = makeEvent({
        payload: {
          type: "assistant",
          message: {
            content: [
              { type: "tool_use", name: "read_file", input: { path: "/foo/bar.ts" } },
            ],
          },
        },
      });

      const result = parseConversationMessage(JSON.stringify(event));

      expect(result).not.toBeNull();
      const content = (result!.payload as Record<string, unknown>)["message"] as Record<string, unknown>;
      expect(content).toBeDefined();
    });
  });
});
