<script lang="ts">
  import { renderMarkdown } from "../markdown.js";

  interface Props {
    content: string;
  }

  let { content }: Props = $props();

  let html = $derived(renderMarkdown(content));
</script>

{#if html}
  <div class="markdown-body">
    {@html html}
  </div>
{/if}

<style>
  .markdown-body {
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--color-text, #e1e4ed);
    word-break: break-word;
    max-height: 400px;
    overflow-y: auto;
  }

  .markdown-body :global(h1),
  .markdown-body :global(h2),
  .markdown-body :global(h3),
  .markdown-body :global(h4),
  .markdown-body :global(h5),
  .markdown-body :global(h6) {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.3;
  }

  .markdown-body :global(h1) {
    font-size: 1.25rem;
    border-bottom: 1px solid var(--color-border, #2a2d3a);
    padding-bottom: 0.25em;
  }

  .markdown-body :global(h2) {
    font-size: 1.1rem;
    border-bottom: 1px solid var(--color-border, #2a2d3a);
    padding-bottom: 0.25em;
  }

  .markdown-body :global(h3) {
    font-size: 1rem;
  }

  .markdown-body :global(h4),
  .markdown-body :global(h5),
  .markdown-body :global(h6) {
    font-size: 0.875rem;
  }

  .markdown-body :global(p) {
    margin-bottom: 0.75em;
  }

  .markdown-body :global(ul),
  .markdown-body :global(ol) {
    padding-left: 1.5em;
    margin-bottom: 0.75em;
  }

  .markdown-body :global(li) {
    margin-bottom: 0.25em;
  }

  .markdown-body :global(blockquote) {
    border-left: 3px solid var(--color-border, #2a2d3a);
    padding: 0.25em 1em;
    margin: 0.75em 0;
    color: var(--color-text-muted, #8b8fa3);
    background: color-mix(in srgb, var(--color-surface, #1a1d27) 50%, transparent);
    border-radius: 0 0.25rem 0.25rem 0;
  }

  .markdown-body :global(pre) {
    background: var(--color-surface, #1a1d27);
    border: 1px solid var(--color-border, #2a2d3a);
    border-radius: 0.375rem;
    padding: 0.75rem;
    margin: 0.75em 0;
    overflow-x: auto;
  }

  .markdown-body :global(pre code) {
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    line-height: 1.5;
    background: none;
    padding: 0;
    border: none;
    border-radius: 0;
  }

  .markdown-body :global(code) {
    font-family: var(--font-mono, monospace);
    font-size: 0.8em;
    background: color-mix(in srgb, var(--color-surface, #1a1d27) 80%, transparent);
    border: 1px solid var(--color-border, #2a2d3a);
    border-radius: 0.25rem;
    padding: 0.1em 0.35em;
  }

  .markdown-body :global(a) {
    color: var(--color-running, #3b82f6);
    text-decoration: none;
  }

  .markdown-body :global(a:hover) {
    text-decoration: underline;
  }

  .markdown-body :global(hr) {
    border: none;
    border-top: 1px solid var(--color-border, #2a2d3a);
    margin: 1em 0;
  }

  .markdown-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75em 0;
    font-size: 0.75rem;
  }

  .markdown-body :global(th),
  .markdown-body :global(td) {
    border: 1px solid var(--color-border, #2a2d3a);
    padding: 0.375rem 0.625rem;
    text-align: left;
  }

  .markdown-body :global(th) {
    background: var(--color-surface, #1a1d27);
    font-weight: 600;
  }

  .markdown-body :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.375rem;
  }

  .markdown-body :global(strong) {
    font-weight: 600;
  }

  /* highlight.js dark theme overrides */
  .markdown-body :global(.hljs) {
    color: var(--color-text, #e1e4ed);
    background: transparent;
  }

  .markdown-body :global(.hljs-keyword),
  .markdown-body :global(.hljs-selector-tag),
  .markdown-body :global(.hljs-built_in) {
    color: #ff7b72;
  }

  .markdown-body :global(.hljs-string),
  .markdown-body :global(.hljs-attr) {
    color: #a5d6ff;
  }

  .markdown-body :global(.hljs-comment),
  .markdown-body :global(.hljs-quote) {
    color: #8b949e;
    font-style: italic;
  }

  .markdown-body :global(.hljs-number),
  .markdown-body :global(.hljs-literal) {
    color: #79c0ff;
  }

  .markdown-body :global(.hljs-title),
  .markdown-body :global(.hljs-section) {
    color: #d2a8ff;
  }

  .markdown-body :global(.hljs-type),
  .markdown-body :global(.hljs-name) {
    color: #7ee787;
  }

  .markdown-body :global(.hljs-params) {
    color: var(--color-text, #e1e4ed);
  }

  .markdown-body :global(.hljs-meta) {
    color: #ffa657;
  }
</style>
