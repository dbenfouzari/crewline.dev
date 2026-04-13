import { describe, it, expect } from "bun:test";
import { renderMarkdown } from "./markdown.js";

describe("renderMarkdown", () => {
  it("returns empty string for empty content", () => {
    expect(renderMarkdown("")).toBe("");
  });

  it("returns empty string for undefined content", () => {
    expect(renderMarkdown(undefined as unknown as string)).toBe("");
  });

  it("returns empty string for null content", () => {
    expect(renderMarkdown(null as unknown as string)).toBe("");
  });

  it("renders headings", () => {
    const result = renderMarkdown("# Hello");
    expect(result).toContain("<h1");
    expect(result).toContain("Hello");
  });

  it("renders bold and italic text", () => {
    const result = renderMarkdown("**bold** and *italic*");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<em>italic</em>");
  });

  it("renders unordered lists", () => {
    const result = renderMarkdown("- item 1\n- item 2");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>item 1</li>");
    expect(result).toContain("<li>item 2</li>");
  });

  it("renders ordered lists", () => {
    const result = renderMarkdown("1. first\n2. second");
    expect(result).toContain("<ol>");
    expect(result).toContain("<li>first</li>");
    expect(result).toContain("<li>second</li>");
  });

  it("renders inline code", () => {
    const result = renderMarkdown("use `const x = 1`");
    expect(result).toContain("<code>const x = 1</code>");
  });

  it("renders fenced code blocks with syntax highlighting", () => {
    const result = renderMarkdown("```js\nconst x = 1;\n```");
    expect(result).toContain("<pre>");
    expect(result).toContain("<code");
    expect(result).toContain("hljs");
  });

  it("renders links with target=_blank and rel=noopener noreferrer", () => {
    const result = renderMarkdown("[click](https://example.com)");
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain("https://example.com");
  });

  it("renders blockquotes", () => {
    const result = renderMarkdown("> quote text");
    expect(result).toContain("<blockquote>");
    expect(result).toContain("quote text");
  });

  it("sanitizes script tags to prevent XSS", () => {
    const result = renderMarkdown('<script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("sanitizes event handler attributes to prevent XSS", () => {
    const result = renderMarkdown('<img src=x onerror="alert(1)">');
    expect(result).not.toContain("onerror");
  });

  it("sanitizes javascript: URLs to prevent XSS", () => {
    const result = renderMarkdown('[click](javascript:alert(1))');
    expect(result).not.toContain("javascript:");
  });

  it("strips iframe tags", () => {
    const result = renderMarkdown('<iframe src="https://evil.com"></iframe>');
    expect(result).not.toContain("<iframe");
  });

  it("preserves class attributes for syntax highlighting", () => {
    const result = renderMarkdown("```typescript\nconst x: number = 1;\n```");
    expect(result).toContain("class=");
  });

  it("renders GitHub alert [!IMPORTANT] as styled div", () => {
    const result = renderMarkdown("> [!IMPORTANT]\n> This is critical.");
    expect(result).toContain('class="markdown-alert markdown-alert-important"');
    expect(result).toContain("📌 Important");
    expect(result).toContain("This is critical.");
  });

  it("renders GitHub alert [!NOTE] as styled div", () => {
    const result = renderMarkdown("> [!NOTE]\n> Some info.");
    expect(result).toContain('class="markdown-alert markdown-alert-note"');
    expect(result).toContain("ℹ️ Note");
    expect(result).toContain("Some info.");
  });

  it("renders GitHub alert [!WARNING] as styled div", () => {
    const result = renderMarkdown("> [!WARNING]\n> Be careful.");
    expect(result).toContain("markdown-alert-warning");
    expect(result).toContain("⚠️ Warning");
  });

  it("renders GitHub alert [!TIP] as styled div", () => {
    const result = renderMarkdown("> [!TIP]\n> Helpful hint.");
    expect(result).toContain("markdown-alert-tip");
    expect(result).toContain("💡 Tip");
  });

  it("renders GitHub alert [!CAUTION] as styled div", () => {
    const result = renderMarkdown("> [!CAUTION]\n> Dangerous.");
    expect(result).toContain("markdown-alert-caution");
    expect(result).toContain("🔴 Caution");
  });

  it("renders multi-line GitHub alerts", () => {
    const result = renderMarkdown("> [!IMPORTANT]\n> Line 1\n> Line 2");
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
  });

  it("preserves regular blockquotes (not alerts)", () => {
    const result = renderMarkdown("> Just a quote");
    expect(result).toContain("<blockquote>");
    expect(result).not.toContain("markdown-alert");
  });

  it("renders tables (GFM)", () => {
    const result = renderMarkdown(
      "| A | B |\n|---|---|\n| 1 | 2 |",
    );
    expect(result).toContain("<table>");
    expect(result).toContain("<td>");
  });
});
