<script lang="ts">
  import { onMount } from "svelte";
  import IssueCard from "$lib/components/IssueCard.svelte";
  import PipelineDetailDrawer from "$lib/components/PipelineDetailDrawer.svelte";
  import { loadJobs } from "$lib/stores/jobs.js";
  import { pipelinesByIssue } from "$lib/stores/pipelines.js";
  import { drawerStore, closeDrawer } from "$lib/stores/drawer.js";
  import { fetchPipelineComments } from "$lib/api.js";
  import type { AgentComment } from "@crewline/shared";

  let drawerComments = $state<AgentComment[]>([]);
  let loadingComments = $state(false);

  onMount(() => {
    void loadJobs();
  });

  /** Fetch comments when the drawer opens for a new issue. */
  $effect(() => {
    const state = $drawerStore;
    if (state.open && state.issueNumber !== null) {
      loadingComments = true;
      fetchPipelineComments(state.issueNumber)
        .then((comments) => {
          drawerComments = comments;
        })
        .catch(() => {
          drawerComments = [];
        })
        .finally(() => {
          loadingComments = false;
        });
    } else {
      drawerComments = [];
    }
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

{#if $drawerStore.open && $drawerStore.issueNumber !== null}
  {@const pipeline = $pipelinesByIssue.get($drawerStore.issueNumber)}
  {#if pipeline}
    <PipelineDetailDrawer
      issueNumber={$drawerStore.issueNumber}
      {pipeline}
      comments={drawerComments}
      expandedAgent={$drawerStore.expandedAgent}
      onclose={closeDrawer}
    />
  {/if}
{/if}

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
