/**
 * GitHub comment client for fetching issue comments and mapping them to agents.
 * Uses the `gh` CLI for authentication, following the same pattern as GitHubSearchClient.
 *
 * Comments are attributed to agents by parsing the header pattern:
 * `## <emoji> <title> — <AgentDisplayName>`
 *
 * If the header format changes in agent prompts, this mapping will break.
 */

import { z } from "zod";
import type { AgentComment } from "@crewline/shared";

/**
 * Regex to extract the agent display name from a comment header.
 * Matches: `## <emoji(s)> <title text> — <AgentName>`
 * The em-dash (—) is the separator between the title and the agent name.
 */
const AGENT_HEADER_PATTERN = /^##\s+\S+\s+.+?\s+—\s+(.+)$/m;

/**
 * Parses the agent display name from a GitHub comment body.
 * Looks for the first H2 header matching the pattern `## <emoji> <title> — <AgentName>`.
 *
 * @param body - The markdown body of a GitHub comment
 * @returns The agent display name, or "unknown" if no match
 */
export function parseAgentNameFromHeader(body: string): string {
  const match = AGENT_HEADER_PATTERN.exec(body);
  if (!match?.[1]) return "unknown";
  return match[1].trim();
}

/**
 * Abstraction over the GitHub API for fetching issue comments.
 * Interface-based for testability — tests inject a mock, production uses `gh`.
 */
export interface GitHubCommentClient {
  /** Fetch all comments for an issue and map them to their originating agents. */
  fetchIssueComments(
    repository: string,
    issueNumber: number,
  ): Promise<AgentComment[]>;
}

/**
 * Schema for `gh api` issue comments response.
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
        return raw.map((item) => {
          const parsed = ghCommentSchema.parse(item);
          return {
            agentName: parseAgentNameFromHeader(parsed.body),
            body: parsed.body,
            url: parsed.html_url,
            createdAt: parsed.created_at,
          };
        });
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
