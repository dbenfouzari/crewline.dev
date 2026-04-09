/**
 * Agent configuration types.
 * An agent is a configured Claude CLI invocation triggered by a GitHub event.
 */

import type { GitHubEventName } from "./github.js";

export interface AgentTrigger {
  /** GitHub event that triggers this agent */
  event: `${GitHubEventName}.${string}`;
  /** Optional: only trigger when this label is applied (for issues.labeled) */
  label?: string;
}

export interface AgentAction {
  /** Move the issue/PR to this board column */
  moveTo?: string;
  /** Post a comment on the issue/PR */
  comment?: boolean;
}

export interface AgentConfig {
  /** Display name of the agent */
  name: string;
  /** What triggers this agent */
  trigger: AgentTrigger;
  /** System prompt for Claude CLI */
  prompt: string;
  /** Action on successful completion */
  onSuccess?: AgentAction;
  /** Action on failure */
  onFailure?: AgentAction;
  /** Action on completion (regardless of outcome) */
  onComplete?: AgentAction;
}
