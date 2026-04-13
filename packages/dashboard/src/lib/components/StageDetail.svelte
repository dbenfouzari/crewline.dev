<script lang="ts">
  import type { PipelineStageSnapshot, AgentComment } from "@crewline/shared";
  import { statusIndicator, formatAgentName, STALE_INDICATOR } from "../status.js";
  import { STALE_THRESHOLD_MS } from "../constants.js";
  import MarkdownRenderer from "./MarkdownRenderer.svelte";

  interface Props {
    stage: PipelineStageSnapshot;
    comments: AgentComment[];
    expanded: boolean;
    ontoggle: () => void;
  }

  let { stage, comments, expanded, ontoggle }: Props = $props();

  /** Reactive clock that only ticks while a stage is running. */
  let now = $state(Date.now());

  $effect(() => {
    if (stage.status !== "running") return;
    const interval = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(interval);
  });

  let isStale = $derived(
    stage.status === "running" &&
      stage.startedAt != null &&
      now - new Date(stage.startedAt).getTime() > STALE_THRESHOLD_MS,
  );

  let indicator = $derived(isStale ? STALE_INDICATOR : statusIndicator(stage.status));

  let duration = $derived.by(() => {
    if (stage.status === "running" && stage.startedAt) {
      const seconds = Math.floor(
        (now - new Date(stage.startedAt).getTime()) / 1000,
      );
      const minutes = Math.floor(seconds / 60);
      if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      }
      return `${seconds}s`;
    }
    if (stage.startedAt && stage.completedAt) {
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

  let isExpandable = $derived(stage.status !== "pending");
</script>

<div class="stage-detail {indicator.cssClass}">
  <button
    class="stage-header"
    onclick={isExpandable ? ontoggle : undefined}
    disabled={!isExpandable}
    aria-expanded={expanded}
  >
    <span class="status-icon">{indicator.icon}</span>
    <span class="agent-name">{formatAgentName(stage.agentName)}</span>
    {#if stage.status === "running" && !isStale}
      <span class="running-indicator">running...</span>
    {/if}
    {#if isStale}
      <span class="stale-indicator">⚠️ stale</span>
    {/if}
    {#if duration}
      <span class="duration">{duration}</span>
    {/if}
    {#if stage.exitCode !== null && stage.exitCode !== undefined}
      <span class="exit-code" class:exit-error={stage.exitCode !== 0}>
        exit {stage.exitCode}
      </span>
    {/if}
    {#if isExpandable}
      <span class="chevron" class:expanded>{expanded ? "▾" : "▸"}</span>
    {/if}
  </button>

  {#if expanded && isExpandable}
    <div class="stage-body">
      {#if comments.length > 0}
        <div class="comments-section">
          <h4>Agent Comment{comments.length > 1 ? "s" : ""}</h4>
          {#each comments as comment}
            <div class="comment">
              <div class="comment-meta">
                <a href={comment.url} target="_blank" rel="noopener noreferrer">
                  View on GitHub
                </a>
                <time>{new Date(comment.createdAt).toLocaleString()}</time>
              </div>
              <MarkdownRenderer content={comment.body} />
            </div>
          {/each}
        </div>
      {:else}
        <p class="no-comment">No comment found</p>
      {/if}

      {#if stage.result}
        <div class="result-section">
          <h4>Job Result / Logs</h4>
          <MarkdownRenderer content={stage.result} />
        </div>
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
    cursor: pointer;
    font: inherit;
    text-align: left;
    color: inherit;
  }

  .stage-header:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .status-icon {
    font-size: 1rem;
    flex-shrink: 0;
  }

  .agent-name {
    font-weight: 600;
    flex-grow: 1;
  }

  .running-indicator {
    font-size: 0.75rem;
    color: var(--color-running, #f59e0b);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  .duration {
    font-size: 0.75rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
  }

  .exit-code {
    font-size: 0.6875rem;
    font-family: var(--font-mono);
    padding: 0.1rem 0.375rem;
    border-radius: 0.25rem;
    background: color-mix(in srgb, var(--color-completed, #22c55e) 15%, transparent);
    color: var(--color-completed, #22c55e);
  }

  .exit-error {
    background: color-mix(in srgb, var(--color-failed, #ef4444) 15%, transparent);
    color: var(--color-failed, #ef4444);
  }

  .chevron {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .stage-body {
    padding: 1rem;
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h4 {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin-bottom: 0.5rem;
  }

  .comment {
    background: color-mix(in srgb, var(--color-surface) 50%, transparent);
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    padding: 0.75rem;
  }

  .comment + .comment {
    margin-top: 0.5rem;
  }

  .comment-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.6875rem;
    color: var(--color-text-muted);
    margin-bottom: 0.5rem;
  }

  .comment-meta a {
    color: var(--color-primary, #3b82f6);
    text-decoration: none;
  }

  .comment-meta a:hover {
    text-decoration: underline;
  }


  .no-comment {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  .status-completed {
    border-color: color-mix(in srgb, var(--color-completed, #22c55e) 30%, transparent);
  }

  .status-running {
    border-color: color-mix(in srgb, var(--color-running, #f59e0b) 30%, transparent);
  }

  .status-failed {
    border-color: color-mix(in srgb, var(--color-failed, #ef4444) 30%, transparent);
  }

  .status-pending {
    opacity: 0.6;
  }

  .status-stale {
    border-color: color-mix(in srgb, var(--color-stale, #f59e0b) 30%, transparent);
  }

  .stale-indicator {
    font-size: 0.75rem;
    color: var(--color-stale, #f59e0b);
    font-weight: 600;
  }
</style>
