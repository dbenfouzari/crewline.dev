<script lang="ts">
  import type { PipelineStageSnapshot } from "@crewline/shared";
  import { statusIndicator, formatAgentName } from "../status.js";
  import { openDrawer } from "../stores/drawer.js";

  interface Props {
    stage: PipelineStageSnapshot;
    issueNumber: number;
  }

  let { stage, issueNumber }: Props = $props();

  function handleClick(event: MouseEvent): void {
    event.stopPropagation();
    openDrawer(issueNumber, stage.agentName);
  }

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

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="stage-chip {indicator.cssClass}" onclick={handleClick}>
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
    cursor: pointer;
  }

  .stage-chip:hover {
    background: color-mix(in srgb, var(--color-surface) 80%, white 20%);
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
