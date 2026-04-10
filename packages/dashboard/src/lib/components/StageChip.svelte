<script lang="ts">
  import type { PipelineStageSnapshot } from "@crewline/shared";
  import { statusIndicator, formatAgentName } from "../status.js";

  interface Props {
    stage: PipelineStageSnapshot;
  }

  let { stage }: Props = $props();

  let indicator = $derived(statusIndicator(stage.status));

  /** Reactive clock that only ticks while a stage is running. */
  let now = $state(Date.now());

  $effect(() => {
    if (stage.status !== "running") return;
    const interval = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(interval);
  });

  let elapsed = $derived.by(() => {
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
</script>

<div class="stage-chip {indicator.cssClass}">
  <span class="icon">{indicator.icon}</span>
  <span class="name">{formatAgentName(stage.agentName)}</span>
  {#if elapsed}
    <span class="elapsed">{elapsed}</span>
  {/if}
</div>

<style>
  .stage-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    white-space: nowrap;
  }

  .icon {
    font-size: 0.875rem;
  }

  .name {
    font-weight: 500;
  }

  .elapsed {
    font-size: 0.6875rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
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
