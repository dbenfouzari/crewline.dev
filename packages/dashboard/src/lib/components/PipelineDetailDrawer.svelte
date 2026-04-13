<script lang="ts">
  import type { PipelineState, AgentComment } from "@crewline/shared";
  import { AGENT_PRIORITY, DEFAULT_PRIORITY } from "@crewline/shared";
  import StageDetail from "./StageDetail.svelte";

  interface Props {
    issueNumber: number;
    pipeline: PipelineState;
    comments: AgentComment[];
    expandedAgent: string | null;
    loading: boolean;
    onclose: () => void;
  }

  let { issueNumber, pipeline, comments, expandedAgent, loading, onclose }: Props =
    $props();

  /** Track which agent sections are expanded. */
  let expandedAgents = $state<Set<string>>(
    new Set(expandedAgent ? [expandedAgent] : []),
  );

  /** Sort stages by pipeline order (requirementsGatherer first → techLead last). */
  let sortedStages = $derived(
    [...pipeline.stages].sort((a, b) => {
      const priorityA = AGENT_PRIORITY[a.agentName] ?? DEFAULT_PRIORITY;
      const priorityB = AGENT_PRIORITY[b.agentName] ?? DEFAULT_PRIORITY;
      return priorityB - priorityA;
    }),
  );

  /**
   * Returns comments attributed to a specific agent by matching the display name
   * from the comment header against the agent key's formatted name.
   */
  function commentsForAgent(agentName: string): AgentComment[] {
    const displayName = agentName
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase())
      .trim();
    return comments.filter(
      (comment) =>
        comment.agentName === displayName ||
        comment.agentName === agentName,
    );
  }

  function toggleAgent(agentName: string): void {
    const next = new Set(expandedAgents);
    if (next.has(agentName)) {
      next.delete(agentName);
    } else {
      next.add(agentName);
    }
    expandedAgents = next;
  }

  function handleBackdropClick(): void {
    onclose();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      onclose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="drawer-backdrop" onclick={handleBackdropClick}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <aside class="drawer" onclick={(e) => e.stopPropagation()}>
    <header class="drawer-header">
      <h2>
        Pipeline #{issueNumber}
        {#if pipeline.title}
          <span class="pipeline-title"> — {pipeline.title}</span>
        {/if}
      </h2>
      <button class="close-button" onclick={onclose} aria-label="Close drawer">
        ✕
      </button>
    </header>

    <div class="drawer-body">
      {#if loading}
        <p class="loading-state">Loading comments...</p>
      {/if}
      {#if sortedStages.length === 0}
        <p class="empty-state">No stages in this pipeline.</p>
      {:else}
        <div class="stages-list">
          {#each sortedStages as stage (stage.jobId)}
            <StageDetail
              {stage}
              comments={commentsForAgent(stage.agentName)}
              expanded={expandedAgents.has(stage.agentName)}
              ontoggle={() => toggleAgent(stage.agentName)}
            />
          {/each}
        </div>
      {/if}
    </div>
  </aside>
</div>

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
    display: flex;
    justify-content: flex-end;
  }

  .drawer {
    width: min(55vw, 800px);
    height: 100%;
    background: var(--color-background, #0a0a0a);
    border-left: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slide-in 0.2s ease-out;
  }

  @keyframes slide-in {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .drawer-header h2 {
    font-size: 1rem;
    font-weight: 600;
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .pipeline-title {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .close-button {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    color: var(--color-text-muted);
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    flex-shrink: 0;
  }

  .close-button:hover {
    color: inherit;
    border-color: var(--color-text-muted);
  }

  .drawer-body {
    flex-grow: 1;
    overflow-y: auto;
    padding: 1rem 1.25rem;
  }

  .stages-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .empty-state,
  .loading-state {
    text-align: center;
    color: var(--color-text-muted);
    padding: 2rem;
  }
</style>
