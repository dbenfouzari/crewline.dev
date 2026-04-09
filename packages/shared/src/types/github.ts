/**
 * GitHub webhook event types relevant to Crewline.
 * Not exhaustive — only the events we handle.
 */

export type GitHubEventName =
  | "issues"
  | "pull_request"
  | "issue_comment"
  | "pull_request_review";

export type GitHubIssueAction = "opened" | "edited" | "labeled" | "closed";
export type GitHubPullRequestAction = "opened" | "synchronize" | "closed" | "reopened";

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
}

export interface GitHubRepository {
  id: number;
  full_name: string;
  clone_url: string;
  default_branch: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: GitHubLabel[];
  user: GitHubUser;
  state: "open" | "closed";
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  user: GitHubUser;
  state: "open" | "closed";
  draft: boolean;
}

export interface GitHubIssuesEvent {
  action: GitHubIssueAction;
  issue: GitHubIssue;
  label?: GitHubLabel;
  repository: GitHubRepository;
  sender: GitHubUser;
}

export interface GitHubPullRequestEvent {
  action: GitHubPullRequestAction;
  pull_request: GitHubPullRequest;
  repository: GitHubRepository;
  sender: GitHubUser;
}

export interface GitHubIssueCommentEvent {
  action: "created" | "edited" | "deleted";
  issue: GitHubIssue;
  comment: {
    id: number;
    body: string;
    user: GitHubUser;
  };
  repository: GitHubRepository;
  sender: GitHubUser;
}

export type GitHubWebhookEvent =
  | GitHubIssuesEvent
  | GitHubPullRequestEvent
  | GitHubIssueCommentEvent;
