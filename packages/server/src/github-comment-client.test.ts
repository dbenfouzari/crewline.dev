/**
 * Tests for GitHubCommentClient — agent comment fetching and header parsing.
 */

import { describe, it, expect } from "bun:test";
import { parseAgentNameFromHeader } from "./github-comment-client.js";

describe("parseAgentNameFromHeader", () => {
  it("extracts agent name from standard header pattern", () => {
    const body = "## 📋 Requirements Analysis — Requirements Gatherer\n\nSome content here.";
    expect(parseAgentNameFromHeader(body)).toBe("Requirements Gatherer");
  });

  it("extracts agent name from architect header", () => {
    const body = "## 🏗️ Architecture Plan — Architect\n\n### Affected Packages";
    expect(parseAgentNameFromHeader(body)).toBe("Architect");
  });

  it("extracts agent name from domain expert header", () => {
    const body = "## 🗣️ Domain Language — Domain Expert\n\n### Ubiquitous Language";
    expect(parseAgentNameFromHeader(body)).toBe("Domain Expert");
  });

  it("returns 'unknown' when no header matches", () => {
    const body = "This is a regular comment with no agent header.";
    expect(parseAgentNameFromHeader(body)).toBe("unknown");
  });

  it("returns 'unknown' for empty body", () => {
    expect(parseAgentNameFromHeader("")).toBe("unknown");
  });

  it("handles header with extra whitespace", () => {
    const body = "##  🔧  Fix Applied  —  Dev Agent\n\nContent";
    expect(parseAgentNameFromHeader(body)).toBe("Dev Agent");
  });

  it("matches only the first header in a multi-header comment", () => {
    const body = "## 📋 Requirements — Requirements Gatherer\n\n## 🏗️ Architecture — Architect";
    expect(parseAgentNameFromHeader(body)).toBe("Requirements Gatherer");
  });

  it("handles header with em-dash (—) correctly", () => {
    const body = "## ✅ Test Results — Test Master\n\nAll tests passed.";
    expect(parseAgentNameFromHeader(body)).toBe("Test Master");
  });

  it("returns 'unknown' for h2 header without em-dash separator", () => {
    const body = "## Some heading without agent pattern\n\nContent";
    expect(parseAgentNameFromHeader(body)).toBe("unknown");
  });
});
