<script lang="ts">
  import { onMount } from "svelte";
  import type { PipelineState, AgentComment } from "@crewline/shared";
  import IssueCard from "$lib/components/IssueCard.svelte";
  import PipelineDetailDrawer from "$lib/components/PipelineDetailDrawer.svelte";
  import { loadJobs } from "$lib/stores/jobs.js";
  import { pipelinesByIssue } from "$lib/stores/pipelines.js";
  import { drawerStore, closeDrawer } from "$lib/stores/drawer.js";
  import { fetchPipelineComments, fetchPipeline } from "$lib/api.js";

  onMount(() => {
    void loadJobs();
  });

  let drawerPipeline = $state<PipelineState | null>(null);
  let drawerComments = $state<AgentComment[]>([]);
  let drawerLoading = $state(false);

  /** Fetch pipeline + comments when the drawer opens. */
  $effect(() => {
    const state = $drawerStore;
    if (state.open && state.issueNumber !== null) {
      const issueNumber = state.issueNumber;
      drawerLoading = true;

      // Use the already-computed pipeline from the store as initial data
      const localPipeline = $pipelinesByIssue.get(issueNumber);
      if (localPipeline) {
        drawerPipeline = localPipeline;
      }

      // Fetch fresh pipeline (with result/exitCode) and comments in parallel
      Promise.all([
        fetchPipeline(issueNumber),
        fetchPipelineComments(issueNumber),
      ])
        .then(([pipeline, comments]) => {
          drawerPipeline = pipeline;
          drawerComments = comments;
        })
        .catch((error) => {
          console.error("[drawer] Failed to load pipeline details:", error);
        })
        .finally(() => {
          drawerLoading = false;
        });
    } else {
      drawerPipeline = null;
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

{#if $drawerStore.open && drawerPipeline}
  <PipelineDetailDrawer
    pipeline={drawerPipeline}
    comments={drawerComments}
    expandedAgent={$drawerStore.expandedAgent}
    onclose={closeDrawer}
  />
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
