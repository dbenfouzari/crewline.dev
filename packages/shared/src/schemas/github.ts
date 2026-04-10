/**
 * Zod schemas for GitHub API responses.
 * Validates external input at the system boundary — the GitHub API is untrusted.
 * These schemas are the runtime counterpart of the TypeScript interfaces in types/github.ts.
 */

import { z } from "zod";

/** Schema for GitHub user objects returned by the API. */
export const GitHubUserSchema = z.object({
  login: z.string(),
  id: z.number().int(),
  avatar_url: z.string(),
});

/** Schema for GitHub repository objects returned by the API. */
export const GitHubRepositorySchema = z.object({
  id: z.number().int(),
  full_name: z.string(),
  clone_url: z.string(),
  default_branch: z.string(),
});

/** Schema for GitHub label objects returned by the API. */
export const GitHubLabelSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  color: z.string(),
});

/** Schema for GitHub issue objects returned by the API. */
export const GitHubIssueSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  body: z.string().nullable(),
  labels: z.array(GitHubLabelSchema),
  user: GitHubUserSchema,
  state: z.enum(["open", "closed"]),
});

/**
 * Schema for GitHub pull request objects returned by the API.
 * head/base default to empty refs because the Issues API endpoint
 * (used during recovery search) does not return PR branch details.
 */
export const GitHubPullRequestSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  body: z.string().nullable(),
  head: z.object({ ref: z.string(), sha: z.string() }).default({ ref: "", sha: "" }),
  base: z.object({ ref: z.string(), sha: z.string() }).default({ ref: "", sha: "" }),
  user: GitHubUserSchema,
  state: z.enum(["open", "closed"]),
  draft: z.boolean().default(false),
});
