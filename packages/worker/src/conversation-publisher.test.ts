import { describe, expect, it } from "bun:test";
import type { ConversationEvent } from "@crewline/shared";
import { buildChannelName } from "./conversation-publisher.js";

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

describe("ConversationPublisher", () => {
  describe("buildChannelName", () => {
    it("builds a channel name scoped to the job ID", () => {
      expect(buildChannelName("job-123")).toBe("crewline:conversation:job-123");
    });

    it("produces unique channels for different job IDs", () => {
      const channel1 = buildChannelName("job-1");
      const channel2 = buildChannelName("job-2");
      expect(channel1).not.toBe(channel2);
    });
  });

  describe("publish contract", () => {
    it("publishes event to correct Redis channel with serialized payload", () => {
      const event = makeEvent({ jobId: "job-42" });
      const expectedChannel = "crewline:conversation:job-42";
      const expectedPayload = JSON.stringify(event);

      expect(buildChannelName(event.jobId)).toBe(expectedChannel);
      expect(JSON.parse(expectedPayload)).toEqual(event);
    });

    it("uses different channels for events from different jobs", () => {
      const event1 = makeEvent({ jobId: "job-1" });
      const event2 = makeEvent({ jobId: "job-2" });

      expect(buildChannelName(event1.jobId)).toBe("crewline:conversation:job-1");
      expect(buildChannelName(event2.jobId)).toBe("crewline:conversation:job-2");
    });

    it("serializes the full ConversationEvent as the message", () => {
      const event = makeEvent({
        id: "evt-99",
        jobId: "job-7",
        type: "assistant:text",
        payload: { type: "assistant", message: { content: [{ type: "text", text: "hello" }] } },
        sequenceNumber: 5,
      });

      const serialized = JSON.stringify(event);
      const deserialized = JSON.parse(serialized) as ConversationEvent;

      expect(deserialized.id).toBe("evt-99");
      expect(deserialized.jobId).toBe("job-7");
      expect(deserialized.type).toBe("assistant:text");
      expect(deserialized.sequenceNumber).toBe(5);
    });
  });
});
