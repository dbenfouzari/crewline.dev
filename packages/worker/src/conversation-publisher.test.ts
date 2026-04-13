import { describe, expect, it } from "bun:test";
import { buildChannelName } from "./conversation-publisher.js";

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
});
