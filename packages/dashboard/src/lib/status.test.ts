import { describe, it, expect } from "bun:test";
import { statusIndicator, formatAgentName } from "./status.js";

describe("statusIndicator", () => {
  it("returns completed indicator for completed status", () => {
    const result = statusIndicator("completed");
    expect(result.icon).toBe("\u2705");
    expect(result.label).toBe("Completed");
    expect(result.cssClass).toBe("status-completed");
  });

  it("returns running indicator for running status", () => {
    const result = statusIndicator("running");
    expect(result.icon).toBe("\uD83D\uDD04");
    expect(result.label).toBe("Running");
    expect(result.cssClass).toBe("status-running");
  });

  it("returns pending indicator for pending status", () => {
    const result = statusIndicator("pending");
    expect(result.icon).toBe("\u23F3");
    expect(result.label).toBe("Pending");
    expect(result.cssClass).toBe("status-pending");
  });

  it("returns failed indicator for failed status", () => {
    const result = statusIndicator("failed");
    expect(result.icon).toBe("\u274C");
    expect(result.label).toBe("Failed");
    expect(result.cssClass).toBe("status-failed");
  });
});

describe("formatAgentName", () => {
  it("formats camelCase agent name to title case", () => {
    expect(formatAgentName("requirementsGatherer")).toBe(
      "Requirements Gatherer",
    );
  });

  it("handles single word agent names", () => {
    expect(formatAgentName("dev")).toBe("Dev");
  });

  it("handles multi-word camelCase names", () => {
    expect(formatAgentName("techLeadReviewer")).toBe("Tech Lead Reviewer");
  });

  it("handles already capitalized first letter", () => {
    expect(formatAgentName("Architect")).toBe("Architect");
  });
});
