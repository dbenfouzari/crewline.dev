import { describe, expect, it } from "bun:test";
import { extractTargetTitle } from "./extract-target-title.js";

describe("extractTargetTitle", () => {
  it("extracts title from issue payload", () => {
    const payload = { issue: { title: "Add CI pipeline" } };
    expect(extractTargetTitle(payload)).toBe("Add CI pipeline");
  });

  it("extracts title from pull_request payload", () => {
    const payload = { pull_request: { title: "Fix login bug" } };
    expect(extractTargetTitle(payload)).toBe("Fix login bug");
  });

  it("prefers issue title over pull_request title when both are present", () => {
    const payload = {
      issue: { title: "Issue title" },
      pull_request: { title: "PR title" },
    };
    expect(extractTargetTitle(payload)).toBe("Issue title");
  });

  it("returns null when neither issue nor pull_request is present", () => {
    const payload = { action: "labeled" };
    expect(extractTargetTitle(payload)).toBeNull();
  });

  it("returns null when issue exists but has no title field", () => {
    const payload = { issue: { number: 5 } };
    expect(extractTargetTitle(payload)).toBeNull();
  });

  it("returns null when pull_request exists but has no title field", () => {
    const payload = { pull_request: { number: 10 } };
    expect(extractTargetTitle(payload)).toBeNull();
  });

  it("returns null when issue and pull_request are malformed (not objects)", () => {
    const payload = { issue: "not-an-object", pull_request: 42 };
    expect(extractTargetTitle(payload)).toBeNull();
  });

  it("returns empty string when issue title is an empty string", () => {
    const payload = { issue: { title: "" } };
    expect(extractTargetTitle(payload)).toBe("");
  });

  it("returns empty string when pull_request title is an empty string and no issue", () => {
    const payload = { pull_request: { title: "" } };
    expect(extractTargetTitle(payload)).toBe("");
  });

  it("falls back to pull_request title when issue has no title", () => {
    const payload = {
      issue: { number: 5 },
      pull_request: { title: "PR fallback" },
    };
    expect(extractTargetTitle(payload)).toBe("PR fallback");
  });

  it("handles issue_comment event payload (title on issue object)", () => {
    const payload = {
      action: "created",
      comment: { body: "some comment" },
      issue: { title: "Comment target issue", number: 7 },
    };
    expect(extractTargetTitle(payload)).toBe("Comment target issue");
  });
});
