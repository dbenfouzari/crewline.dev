<script lang="ts">
  import type { PipelineState } from "@crewline/shared";
  import StageChip from "./StageChip.svelte";

  interface Props {
    issueNumber: number;
    pipeline: PipelineState;
  }

  let { issueNumber, pipeline }: Props = $props();

  let sortedStages = $derived(
    [...pipeline.stages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
  );
</script>

<article class="issue-card">
  <header>
    <h2>#{issueNumber}</h2>
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
