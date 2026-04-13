import { describe, expect, it } from "bun:test";
import { CONVERSATION_CHANNEL_PATTERN } from "./conversation-subscriber.js";

describe("ConversationSubscriber", () => {
  describe("CONVERSATION_CHANNEL_PATTERN", () => {
    it("uses a pattern that matches all conversation channels", () => {
      expect(CONVERSATION_CHANNEL_PATTERN).toBe("crewline:conversation:*");
    });
  });
});
