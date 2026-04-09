import type { CrewlineConfig } from "@crewline/shared";
import { type ValidatedConfig, configSchema } from "./schema.js";

/**
 * Validates and returns a type-safe Crewline configuration.
 * Accepts loose input, validates with Zod, returns typed config.
 * Throws a ZodError if the config is invalid.
 */
export function defineConfig(raw: ValidatedConfig): CrewlineConfig {
  return configSchema.parse(raw) as CrewlineConfig;
}
