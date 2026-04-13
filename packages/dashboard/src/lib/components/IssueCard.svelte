<script lang="ts">
  import type { PipelineState } from "@crewline/shared";
  import { AGENT_PRIORITY, DEFAULT_PRIORITY } from "@crewline/shared";
  import StageChip from "./StageChip.svelte";
  import { openDrawer } from "../stores/drawer.js";

  interface Props {
    issueNumber: number;
    pipeline: PipelineState;
  }

  let { issueNumber, pipeline }: Props = $props();

  function handleHeaderClick(): void {
    openDrawer(issueNumber);
  }

  /** Sort stages by pipeline order (requirementsGatherer first → techLead last). */
  let sortedStages = $derived(
    [...pipeline.stages].sort(
      (a, b) => {
        const priorityA = AGENT_PRIORITY[a.agentName] ?? DEFAULT_PRIORITY;
        const priorityB = AGENT_PRIORITY[b.agentName] ?? DEFAULT_PRIORITY;
        return priorityB - priorityA;
      },
    ),
  );

  let hasPrStages = $derived(
    pipeline.stages.some(
      (stage) => stage.agentName === "testMaster" || stage.agentName === "techLead",
    ),
  );
</script>

<article class="issue-card">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <header onclick={handleHeaderClick} class="clickable">
    <h2>
      <span class="issue-number">#{issueNumber}</span>
      {#if pipeline.title}
        <span class="issue-title" title={pipeline.title}> — {pipeline.title}</span>
      {/if}
    </h2>
    {#if hasPrStages}
      <span class="pr-badge">PR linked</span>
    {/if}
    <span class="stage-count"
      >{pipeline.stages.length} stage{pipeline.stages.length === 1
        ? ""
        : "s"}</span
    >
  </header>
  <div class="stages">
    {#each sortedStages as stage (stage.jobId)}
      <StageChip {stage} {issueNumber} />
    {/each}
  </div>
</article>

<style>
  .issue-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .clickable {
    cursor: pointer;
    border-radius: 0.25rem;
  }

  .clickable:hover {
    background: color-mix(in srgb, var(--color-surface) 80%, white 20%);
  }

  h2 {
    font-size: 1rem;
    font-weight: 600;
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .issue-number {
    flex-shrink: 0;
  }

  .issue-title {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .pr-badge {
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
    border-radius: 0.25rem;
    background: var(--color-primary, #3b82f6);
    color: white;
    font-weight: 500;
  }

  .stage-count {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .stages {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
