/**
 * Extracts the human-readable title from a GitHub webhook payload.
 * Checks `issue.title` first, then `pull_request.title`.
 *
 * @param payload - Raw GitHub webhook payload
 * @returns The issue/PR title, or null if not found
 */
export function extractTargetTitle(payload: Record<string, unknown>): string | null {
  const issue = payload["issue"] as { title?: string } | undefined;
  if (typeof issue?.title === "string") return issue.title;

  const pr = payload["pull_request"] as { title?: string } | undefined;
  if (typeof pr?.title === "string") return pr.title;

  return null;
}
