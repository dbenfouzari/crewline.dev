<script lang="ts">
  import type { PipelineState } from "@crewline/shared";
  import { AGENT_PRIORITY, DEFAULT_PRIORITY } from "@crewline/shared";
  import StageChip from "./StageChip.svelte";

  interface Props {
    issueNumber: number;
    pipeline: PipelineState;
  }

  let { issueNumber, pipeline }: Props = $props();

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
  <header>
    <h2>#{issueNumber}</h2>
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
      <StageChip {stage} />
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

  h2 {
    font-size: 1rem;
    font-weight: 600;
    font-family: var(--font-mono);
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
