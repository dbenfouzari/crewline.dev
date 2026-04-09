/**
 * User-facing configuration types.
 */

import type { AgentConfig } from "./agent.js";

export interface CrewlineConfig {
  github: {
    webhookSecret: string;
    repos: string[];
  };
  agents: Record<string, AgentConfig>;
  board: {
    columns: string[];
  };
}
