/**
 * Pipeline label types and utilities.
 * A pipeline label maps a GitHub label to an agent and entity type,
 * enabling recovery of pending work on startup.
 */

import type { AgentConfig } from "./agent.js";

/**
 * Describes a GitHub label that represents a stage in the agent pipeline.
 * Derived from AgentConfig — not stored separately.
 */
export interface PipelineLabel {
  /** The GitHub label string (e.g., "ready", "ready-for-dev") */
  label: string;
  /** The agent key in the config (e.g., "requirementsGatherer", "dev") */
  agentKey: string;
  /** Whether this label applies to issues or pull requests */
  entityType: "issue" | "pull_request";
}

/**
 * Derives pipeline labels from agent configuration.
 * Only agents with a trigger label are included — agents triggered by
 * other events (e.g., pull_request.opened without a label) are not
 * part of the label-based pipeline.
 *
 * @param agents - Map of agent key to agent configuration
 * @returns Array of pipeline label descriptors
 */
export function buildPipelineLabels(
  agents: Record<string, AgentConfig>,
): PipelineLabel[] {
  const labels: PipelineLabel[] = [];

  for (const [agentKey, agent] of Object.entries(agents)) {
    if (!agent.trigger.label) continue;

    const [eventPrefix] = agent.trigger.event.split(".");
    const entityType: "issue" | "pull_request" =
      eventPrefix === "pull_request" ? "pull_request" : "issue";

    labels.push({
      label: agent.trigger.label,
      agentKey,
      entityType,
    });
  }

  return labels;
}
