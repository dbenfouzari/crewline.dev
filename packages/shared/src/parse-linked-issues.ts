/**
 * Parses GitHub closing keyword references from a PR body.
 * Recognizes `Closes`, `Fixes`, and `Resolves` (case-insensitive)
 * followed by `#<number>`.
 *
 * @param body - The PR body text to parse
 * @returns Array of unique, valid issue numbers (positive integers only)
 */
export function parseLinkedIssueNumbers(body: string): number[] {
  const pattern = /\b(?:closes|fixes|resolves)\s+#(\d+)/gi;
  const seen = new Set<number>();
  const results: number[] = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const issueNumber = Number(match[1]);
    if (issueNumber > 0 && !seen.has(issueNumber)) {
      seen.add(issueNumber);
      results.push(issueNumber);
    }
  }

  return results;
}
