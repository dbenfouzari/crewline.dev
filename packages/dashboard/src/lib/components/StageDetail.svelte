<script lang="ts">
  import type { PipelineStageSnapshot, AgentComment } from "@crewline/shared";
  import { statusIndicator, formatAgentName } from "../status.js";

  interface Props {
    stage: PipelineStageSnapshot;
    comments: AgentComment[];
    expanded: boolean;
    ontoggle: () => void;
  }

  let { stage, comments, expanded, ontoggle }: Props = $props();

  let indicator = $derived(statusIndicator(stage.status));

  let elapsed = $derived.by(() => {
    if (
      (stage.status === "completed" || stage.status === "failed") &&
      stage.startedAt &&
      stage.completedAt
    ) {
      const seconds = Math.floor(
        (new Date(stage.completedAt).getTime() -
          new Date(stage.startedAt).getTime()) /
          1000,
      );
      const minutes = Math.floor(seconds / 60);
      if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      }
      return `${seconds}s`;
    }
    return null;
  });

  let canExpand = $derived(stage.status !== "pending");
</script>

<div class="stage-detail {indicator.cssClass}">
  <button
    class="stage-header"
    onclick={canExpand ? ontoggle : undefined}
    disabled={!canExpand}
    aria-expanded={expanded}
  >
    <span class="icon">{indicator.icon}</span>
    <span class="name">{formatAgentName(stage.agentName)}</span>
    {#if stage.status === "running"}
      <span class="running-indicator">running...</span>
    {/if}
    {#if elapsed}
      <span class="elapsed">{elapsed}</span>
    {/if}
    {#if stage.exitCode !== null && stage.exitCode !== undefined}
      <span class="exit-code" class:exit-error={stage.exitCode !== 0}>
        exit {stage.exitCode}
      </span>
    {/if}
    {#if canExpand}
      <span class="chevron" class:open={expanded}>&#9656;</span>
    {/if}
  </button>

  {#if expanded && canExpand}
    <div class="stage-body">
      {#if comments.length > 0}
        {#each comments as comment}
          <div class="comment-section">
            <div class="comment-header">
              <a href={comment.url} target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
              <time>{new Date(comment.createdAt).toLocaleString()}</time>
            </div>
            <pre class="comment-body">{comment.body}</pre>
          </div>
        {/each}
      {:else}
        <p class="no-comment">No comment found</p>
      {/if}

      {#if stage.result}
        <details class="result-section">
          <summary>Job Result / Logs</summary>
          <pre class="result-body">{stage.result}</pre>
        </details>
      {/if}
    </div>
  {/if}
</div>

<style>
  .stage-detail {
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .stage-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--color-surface);
    border: none;
    color: var(--color-text);
    font-family: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
  }

  .stage-header:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .icon {
    font-size: 1rem;
  }

  .name {
    font-weight: 600;
  }

  .running-indicator {
    color: var(--color-running);
    font-style: italic;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .elapsed {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .exit-code {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-completed);
  }

  .exit-error {
    color: var(--color-failed);
  }

  .chevron {
    margin-left: auto;
    transition: transform 0.2s;
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .stage-body {
    padding: 1rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg);
  }

  .comment-section {
    margin-bottom: 1rem;
  }

  .comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .comment-header a {
    color: var(--color-running);
    text-decoration: none;
  }

  .comment-header a:hover {
    text-decoration: underline;
  }

  .comment-body {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    line-height: 1.5;
    max-height: 400px;
    overflow-y: auto;
    padding: 0.75rem;
    background: var(--color-surface);
    border-radius: 0.375rem;
    border: 1px solid var(--color-border);
  }

  .no-comment {
    color: var(--color-text-muted);
    font-style: italic;
    font-size: 0.875rem;
  }

  .result-section {
    margin-top: 1rem;
  }

  .result-section summary {
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-text-muted);
    margin-bottom: 0.5rem;
  }

  .result-body {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    line-height: 1.5;
    max-height: 300px;
    overflow-y: auto;
    padding: 0.75rem;
    background: var(--color-surface);
    border-radius: 0.375rem;
    border: 1px solid var(--color-border);
  }

  .status-completed {
    border-color: color-mix(in srgb, var(--color-completed) 30%, transparent);
  }

  .status-running {
    border-color: color-mix(in srgb, var(--color-running) 30%, transparent);
  }

  .status-failed {
    border-color: color-mix(in srgb, var(--color-failed) 30%, transparent);
  }

  .status-pending {
    opacity: 0.6;
  }
</style>
