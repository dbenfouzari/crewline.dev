<script lang="ts">
  import { onMount } from "svelte";
  import IssueCard from "$lib/components/IssueCard.svelte";
  import { loadJobs } from "$lib/stores/jobs.js";
  import { pipelinesByIssue } from "$lib/stores/pipelines.js";

  onMount(() => {
    void loadJobs();
  });
</script>

<div class="page">
  {#if $pipelinesByIssue.size === 0}
    <div class="empty-state">
      <p>No active pipelines</p>
      <p class="hint">Jobs will appear here as issues are processed.</p>
    </div>
  {:else}
    <div class="pipeline-list">
      {#each [...$pipelinesByIssue.entries()] as [issueNumber, pipeline] (issueNumber)}
        <IssueCard {issueNumber} {pipeline} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .pipeline-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
  }

  .empty-state p:first-child {
    font-size: 1.125rem;
    font-weight: 500;
  }

  .hint {
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
</style>
