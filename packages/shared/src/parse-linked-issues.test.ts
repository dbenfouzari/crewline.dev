import { describe, expect, it } from "bun:test";
import { parseLinkedIssueNumbers } from "./parse-linked-issues.js";

describe("parseLinkedIssueNumbers", () => {
  it("parses 'Closes #N' from PR body", () => {
    expect(parseLinkedIssueNumbers("Closes #42")).toEqual([42]);
  });

  it("parses 'Fixes #N' from PR body", () => {
    expect(parseLinkedIssueNumbers("Fixes #10")).toEqual([10]);
  });

  it("parses 'Resolves #N' from PR body", () => {
    expect(parseLinkedIssueNumbers("Resolves #7")).toEqual([7]);
  });

  it("is case-insensitive", () => {
    expect(parseLinkedIssueNumbers("closes #1")).toEqual([1]);
    expect(parseLinkedIssueNumbers("CLOSES #2")).toEqual([2]);
    expect(parseLinkedIssueNumbers("Fixes #3")).toEqual([3]);
    expect(parseLinkedIssueNumbers("RESOLVES #4")).toEqual([4]);
  });

  it("parses multiple references in the same body", () => {
    const body = "Closes #10\nAlso Fixes #20\nResolves #30";
    expect(parseLinkedIssueNumbers(body)).toEqual([10, 20, 30]);
  });

  it("returns empty array when no closing keywords found", () => {
    expect(parseLinkedIssueNumbers("This PR does something")).toEqual([]);
    expect(parseLinkedIssueNumbers("See issue #42 for context")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseLinkedIssueNumbers("")).toEqual([]);
  });

  it("filters out issue number 0", () => {
    expect(parseLinkedIssueNumbers("Closes #0")).toEqual([]);
  });

  it("filters out negative numbers", () => {
    expect(parseLinkedIssueNumbers("Closes #-1")).toEqual([]);
  });

  it("deduplicates issue numbers", () => {
    const body = "Closes #5\nFixes #5";
    expect(parseLinkedIssueNumbers(body)).toEqual([5]);
  });

  it("handles closing keywords mid-sentence", () => {
    const body = "This PR closes #15 and resolves #20.";
    expect(parseLinkedIssueNumbers(body)).toEqual([15, 20]);
  });

  it("handles comma-separated references", () => {
    const body = "Closes #1, closes #2, closes #3";
    expect(parseLinkedIssueNumbers(body)).toEqual([1, 2, 3]);
  });
});
