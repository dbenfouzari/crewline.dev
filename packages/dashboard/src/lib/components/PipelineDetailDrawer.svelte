<script lang="ts">
  import type { PipelineState, AgentComment } from "@crewline/shared";
  import { AGENT_PRIORITY, DEFAULT_PRIORITY } from "@crewline/shared";
  import StageDetail from "./StageDetail.svelte";
  import { formatAgentName } from "../status.js";

  interface Props {
    pipeline: PipelineState;
    comments: AgentComment[];
    expandedAgent: string | null;
    onclose: () => void;
  }

  let { pipeline, comments, expandedAgent, onclose }: Props = $props();

  /** Track which agent sections are expanded. */
  let expandedAgents = $state(new Set<string>(expandedAgent ? [expandedAgent] : []));

  /** Sort stages by pipeline priority order. */
  let sortedStages = $derived(
    [...pipeline.stages].sort((a, b) => {
      const priorityA = AGENT_PRIORITY[a.agentName] ?? DEFAULT_PRIORITY;
      const priorityB = AGENT_PRIORITY[b.agentName] ?? DEFAULT_PRIORITY;
      return priorityB - priorityA;
    }),
  );

  /**
   * Groups comments by agent display name for efficient lookup.
   * Maps display name back to agent comments.
   */
  let commentsByAgent = $derived.by(() => {
    const map = new Map<string, AgentComment[]>();
    for (const comment of comments) {
      const displayName = comment.agentName;
      const existing = map.get(displayName);
      if (existing) {
        existing.push(comment);
      } else {
        map.set(displayName, [comment]);
      }
    }
    return map;
  });

  function toggleAgent(agentName: string): void {
    const next = new Set(expandedAgents);
    if (next.has(agentName)) {
      next.delete(agentName);
    } else {
      next.add(agentName);
    }
    expandedAgents = next;
  }

  function getCommentsForAgent(agentName: string): AgentComment[] {
    const displayName = formatAgentName(agentName);
    return commentsByAgent.get(displayName) ?? [];
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      onclose();
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="drawer-backdrop" onclick={handleBackdropClick}>
  <aside class="drawer" role="dialog" aria-label="Pipeline detail">
    <header class="drawer-header">
      <h2>
        <span class="issue-number">#{pipeline.issueNumber}</span>
        {#if pipeline.title}
          <span class="issue-title">{pipeline.title}</span>
        {/if}
      </h2>
      <button class="close-button" onclick={onclose} aria-label="Close drawer">
        &times;
      </button>
    </header>

    <div class="drawer-body">
      <div class="stages-list">
        {#each sortedStages as stage (stage.jobId)}
          <StageDetail
            {stage}
            comments={getCommentsForAgent(stage.agentName)}
            expanded={expandedAgents.has(stage.agentName)}
            ontoggle={() => toggleAgent(stage.agentName)}
          />
        {/each}
      </div>
    </div>
  </aside>
</div>

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
    display: flex;
    justify-content: flex-end;
  }

  .drawer {
    width: min(55vw, 700px);
    height: 100vh;
    background: var(--color-bg);
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

  .issue-number {
    color: var(--color-text);
  }

  .issue-title {
    color: var(--color-text-muted);
    font-weight: 400;
    margin-left: 0.5rem;
  }

  .close-button {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .close-button:hover {
    color: var(--color-text);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.25rem;
  }

  .stages-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
