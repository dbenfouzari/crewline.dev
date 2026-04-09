/**
 * Event router: matches incoming GitHub webhook events to configured agents.
 */

import type { AgentConfig, GitHubEventName } from "@crewline/shared";

/**
 * Given a map of agents and an incoming event, returns all agents whose trigger matches.
 * Returns an array of [agentKey, agentConfig] tuples.
 */
export function matchAgents(
  agents: Record<string, AgentConfig>,
  eventName: GitHubEventName,
  payload: Record<string, unknown>,
): Array<[string, AgentConfig]> {
  const action = payload["action"] as string | undefined;
  if (!action) return [];

  const matches: Array<[string, AgentConfig]> = [];

  for (const [key, agent] of Object.entries(agents)) {
    const [triggerEvent, triggerAction] = agent.trigger.event.split(".");
    if (triggerEvent !== eventName || triggerAction !== action) continue;

    // If trigger has a label filter, check it
    if (agent.trigger.label) {
      const label = payload["label"] as { name?: string } | undefined;
      if (label?.name !== agent.trigger.label) continue;
    }

    matches.push([key, agent]);
  }

  return matches;
}
