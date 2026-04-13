/**
 * A GitHub issue comment attributed to a specific agent.
 * Read-only projection fetched on demand from the GitHub API —
 * not stored locally.
 *
 * Attribution is by convention: the comment header pattern
 * `## <emoji> <title> — <AgentDisplayName>` maps to an agent.
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
