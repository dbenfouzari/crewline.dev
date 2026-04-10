/**
 * Maps JobStatus values to visual indicators for the dashboard UI.
 */

import type { JobStatus } from "@crewline/shared";

/**
 * Visual representation of a JobStatus in the dashboard.
 */
export interface StatusIndicator {
  /** Emoji icon representing the status */
  icon: string;
  /** Human-readable label */
  label: string;
  /** CSS class for styling */
  cssClass: string;
}

const STATUS_MAP: Record<JobStatus, StatusIndicator> = {
  completed: { icon: "\u2705", label: "Completed", cssClass: "status-completed" },
  running: { icon: "\uD83D\uDD04", label: "Running", cssClass: "status-running" },
  pending: { icon: "\u23F3", label: "Pending", cssClass: "status-pending" },
  failed: { icon: "\u274C", label: "Failed", cssClass: "status-failed" },
};

/**
 * Returns the visual indicator for a given job status.
 *
 * @param status - The job status to map
 * @returns Icon, label, and CSS class for the status
 */
export function statusIndicator(status: JobStatus): StatusIndicator {
  return STATUS_MAP[status];
}

/**
 * Formats a camelCase agent name into a human-readable label.
 *
 * @param agentName - The camelCase agent key (e.g., "requirementsGatherer")
 * @returns Human-readable label (e.g., "Requirements Gatherer")
 */
export function formatAgentName(agentName: string): string {
  return agentName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}
