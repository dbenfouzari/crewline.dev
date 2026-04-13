import { describe, it, expect } from "bun:test";
import { statusIndicator, formatAgentName, STALE_INDICATOR } from "./status.js";
import { STALE_THRESHOLD_MS } from "./constants.js";

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

describe("STALE_INDICATOR", () => {
  it("has a warning icon", () => {
    expect(STALE_INDICATOR.icon).toBe("⚠️");
  });

  it("has 'Stale' label", () => {
    expect(STALE_INDICATOR.label).toBe("Stale");
  });

  it("has status-stale CSS class", () => {
    expect(STALE_INDICATOR.cssClass).toBe("status-stale");
  });
});

describe("STALE_THRESHOLD_MS", () => {
  it("defaults to 60 minutes in milliseconds", () => {
    expect(STALE_THRESHOLD_MS).toBe(60 * 60 * 1000);
  });

  it("is a positive number", () => {
    expect(STALE_THRESHOLD_MS).toBeGreaterThan(0);
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
