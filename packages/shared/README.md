# @crewline/shared

Domain types for the Crewline orchestrator. This is the **domain layer** — the innermost layer in the Clean Architecture. It defines the ubiquitous language of the system through pure TypeScript types with zero dependencies.

All other packages (`@crewline/config`, `@crewline/server`, `@crewline/worker`) depend on `@crewline/shared`. It never depends on anything outside itself.

## Public API

### GitHub Types

| Type | Description |
|------|-------------|
| `GitHubEventName` | Union of supported webhook events: `"issues"`, `"pull_request"`, `"issue_comment"`, `"pull_request_review"` |
| `GitHubIssueAction` | Actions for issue events: `"opened"`, `"edited"`, `"labeled"`, `"closed"` |
| `GitHubPullRequestAction` | Actions for PR events: `"opened"`, `"synchronize"`, `"closed"`, `"reopened"` |
| `GitHubUser` | GitHub user with `login`, `id`, `avatar_url` |
| `GitHubRepository` | Repository with `id`, `full_name`, `clone_url`, `default_branch` |
| `GitHubLabel` | Label with `id`, `name`, `color` |
| `GitHubIssue` | Issue with `number`, `title`, `body`, `labels`, `user`, `state` |
| `GitHubPullRequest` | Pull request with `number`, `title`, `body`, `head`, `base`, `user`, `state`, `draft` |
| `GitHubIssuesEvent` | Webhook payload for issue events |
| `GitHubPullRequestEvent` | Webhook payload for pull request events |
| `GitHubIssueCommentEvent` | Webhook payload for issue comment events |
| `GitHubWebhookEvent` | Discriminated union of all webhook event types |

### Agent Types

| Type | Description |
|------|-------------|
| `AgentTrigger` | Condition that activates an agent — an `event` string (e.g., `"issues.labeled"`) and an optional `label` filter |
| `AgentAction` | Side effect after agent completion — optional `moveTo` (board column) and `comment` flag |
| `AgentConfig` | Full agent definition: `name`, `trigger`, `prompt`, and optional `onSuccess`/`onFailure`/`onComplete` actions |

### Job Types

| Type | Description |
|------|-------------|
| `JobStatus` | Lifecycle state: `"pending"`, `"running"`, `"completed"`, `"failed"` |
| `Job` | A single agent execution instance with `id`, `agentName`, `status`, `payload`, `repository`, `targetNumber`, timestamps, `result`, and `exitCode` |
| `NewJob` | Subset of `Job` used to enqueue a new execution: `agentName`, `payload`, `repository`, `targetNumber` |

### Config Types

| Type | Description |
|------|-------------|
| `CrewlineConfig` | Top-level configuration: `github` (webhook secret, repos), `agents` (record of `AgentConfig`), `board` (columns) |

## Usage Examples

```typescript
import type { AgentConfig, Job, CrewlineConfig, GitHubEventName } from "@crewline/shared";

// Reference an agent configuration
const agent: AgentConfig = {
  name: "triage",
  trigger: { event: "issues.labeled", label: "bug" },
  prompt: "Triage this bug report",
};

// Track a job's status
function isTerminal(job: Job): boolean {
  return job.status === "completed" || job.status === "failed";
}

// Type-safe event handling
function handleEvent(event: GitHubEventName): void {
  // event is narrowed to "issues" | "pull_request" | "issue_comment" | "pull_request_review"
}
```

## Architecture

`@crewline/shared` is the **domain layer** in the Clean Architecture:

```
Domain (@crewline/shared) → Application (@crewline/config) → Infrastructure (@crewline/server, @crewline/worker)
```

- **Zero dependencies** — no runtime packages, no framework code
- **Exports only types** — no runtime footprint, use `import type` when importing
- **Single source of truth** — all domain concepts are defined here and referenced by every other package
- **Defines the ubiquitous language** — `Agent`, `Trigger`, `Action`, `Job`, `CrewlineConfig` are the terms used everywhere in the system
