import { Marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import hljs from "highlight.js";

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language =
        lang && hljs.getLanguage(lang) ? lang : undefined;
      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      return `<pre><code class="hljs${language ? ` language-${language}` : ""}">${highlighted}</code></pre>`;
    },
  },
});

const ALERT_TYPES: Record<string, { icon: string; className: string }> = {
  NOTE: { icon: "ℹ️", className: "markdown-alert-note" },
  TIP: { icon: "💡", className: "markdown-alert-tip" },
  IMPORTANT: { icon: "📌", className: "markdown-alert-important" },
  WARNING: { icon: "⚠️", className: "markdown-alert-warning" },
  CAUTION: { icon: "🔴", className: "markdown-alert-caution" },
};

const ALERT_PATTERN = /^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n((?:>.*(?:\n|$))*)/gm;

/**
 * Transforms GitHub-flavored alert blockquotes (`> [!NOTE]`, `> [!IMPORTANT]`, etc.)
 * into styled HTML divs before Markdown parsing.
 */
function transformGitHubAlerts(markdown: string): string {
  return markdown.replace(ALERT_PATTERN, (_match, type: string, body: string) => {
    const alert = ALERT_TYPES[type];
    if (!alert) return _match;

    const content = body
      .split("\n")
      .map((line) => line.replace(/^> ?/, ""))
      .join("\n")
      .trim();

    return `<div class="markdown-alert ${alert.className}"><p class="markdown-alert-title">${alert.icon} ${type.charAt(0) + type.slice(1).toLowerCase()}</p>\n\n${content}\n\n</div>\n\n`;
  });
}

/**
 * Parses a Markdown string into sanitized HTML with syntax-highlighted code blocks.
 *
 * @param content - Raw Markdown string to render
 * @returns Sanitized HTML string safe for DOM insertion via {@html}
 */
export function renderMarkdown(content: string): string {
  if (!content) {
    return "";
  }

  const rawHtml = marked.parse(transformGitHubAlerts(content)) as string;

  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "strong", "em", "del", "s",
      "ul", "ol", "li",
      "blockquote",
      "pre", "code",
      "a",
      "table", "thead", "tbody", "tr", "th", "td",
      "img",
      "span",
      "div",
      "input",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "type", "checked", "disabled"],
    ALLOW_DATA_ATTR: false,
  });

  return addLinkSafety(cleanHtml);
}

/**
 * Adds target="_blank" and rel="noopener noreferrer" to all anchor tags.
 */
function addLinkSafety(html: string): string {
  return html.replace(
    /<a\s/g,
    '<a target="_blank" rel="noopener noreferrer" ',
  );
}
