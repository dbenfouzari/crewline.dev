/**
 * GitHub comment client for fetching issue comments and mapping them to agents.
 * Follows the same interface + factory pattern as GitHubSearchClient.
 *
 * Agent attribution relies on the comment header convention:
 * `## <emoji> <title> — <AgentDisplayName>`
 *
 * The em dash (—) separates the section title from the agent name.
 */

import { z } from "zod";
import type { AgentComment } from "@crewline/shared";

/**
 * Regex pattern to extract the agent display name from a comment header.
 *
 * Matches: `## <anything> — <AgentName>`
 * The agent name is captured in group 1.
 *
 * @example "## 📋 Requirements Analysis — Requirements Gatherer" → "Requirements Gatherer"
 */
const AGENT_HEADER_PATTERN = /^##\s+.+?\s+—\s+(.+?)\s*$/m;

/**
 * Extracts the agent display name from a GitHub comment body by matching
 * the header convention.
 *
 * @param body - The full markdown body of a GitHub comment
 * @returns The agent display name, or null if no matching header was found
 */
export function parseAgentNameFromHeader(body: string): string | null {
  const match = AGENT_HEADER_PATTERN.exec(body);
  return match?.[1]?.trim() ?? null;
}

/** Raw comment shape from the GitHub API (subset of fields we need). */
interface RawGitHubComment {
  body: string;
  html_url: string;
  created_at: string;
}

/**
 * Maps raw GitHub comments to AgentComment domain objects.
 * Comments that don't match the header pattern are attributed to "unknown".
 *
 * @param rawComments - Array of raw GitHub comment objects
 * @returns Array of AgentComment domain objects
 */
export function mapCommentsToAgents(
  rawComments: RawGitHubComment[],
): AgentComment[] {
  return rawComments.map((comment) => ({
    agentName: parseAgentNameFromHeader(comment.body) ?? "unknown",
    body: comment.body,
    url: comment.html_url,
    createdAt: comment.created_at,
  }));
}

/**
 * Abstraction over the GitHub API for fetching issue comments.
 * Interface-based for testability — tests inject a mock, production uses `gh`.
 */
export interface GitHubCommentClient {
  /**
   * Fetches all comments for a GitHub issue and maps them to agents.
   *
   * @param repository - The repository in "owner/repo" format
   * @param issueNumber - The GitHub issue number
   * @returns Array of AgentComment objects, ordered chronologically
   */
  fetchIssueComments(
    repository: string,
    issueNumber: number,
  ): Promise<AgentComment[]>;
}

/**
 * Zod schema for validating `gh api` issue comments response.
 */
const ghCommentSchema = z.object({
  body: z.string(),
  html_url: z.string(),
  created_at: z.string(),
});

/**
 * Creates a GitHubCommentClient that uses the `gh` CLI.
 * Requires `gh` CLI to be authenticated in the environment.
 */
export function createGitHubCommentClient(): GitHubCommentClient {
  return {
    async fetchIssueComments(
      repository: string,
      issueNumber: number,
    ): Promise<AgentComment[]> {
      try {
        const proc = Bun.spawn(
          [
            "gh",
            "api",
            `repos/${repository}/issues/${String(issueNumber)}/comments`,
            "--paginate",
          ],
          { stdout: "pipe", stderr: "pipe" },
        );

        const stdout = await new Response(proc.stdout).text();
        await proc.exited;

        if (!stdout.trim()) return [];

        const raw = JSON.parse(stdout) as unknown[];
        const parsed = raw.map((item) => ghCommentSchema.parse(item));
        return mapCommentsToAgents(parsed);
      } catch (error) {
        console.error(
          `[comments] Failed to fetch comments for ${repository}#${String(issueNumber)}:`,
          error,
        );
        return [];
      }
    },
  };
}
