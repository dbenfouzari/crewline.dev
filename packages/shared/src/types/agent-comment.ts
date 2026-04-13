/**
 * A GitHub issue comment attributed to a specific agent.
 * Identified by matching the comment's header pattern
 * (`## <emoji> <title> — <AgentDisplayName>`).
 * A read-only projection fetched on demand — not stored locally.
 */
export interface AgentComment {
  /** The agent display name extracted from the comment header (e.g., "Requirements Gatherer") */
  agentName: string;
  /** The full markdown body of the comment */
  body: string;
  /** URL to the comment on GitHub */
  url: string;
  /** ISO 8601 timestamp of when the comment was created */
  createdAt: string;
}
