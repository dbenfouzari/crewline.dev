/**
 * Pipeline stage priority constants.
 * Lower number = processed first (further along in the pipeline).
 * Agents later in the pipeline get higher priority so in-progress
 * issues finish before new ones start.
 *
 * This is the single source of truth for job ordering — used by both
 * the queue (for enqueue priority) and recovery (for furthest-along detection).
 */
export const AGENT_PRIORITY: Record<string, number> = {
  techLead: 1,
  testMaster: 2,
  dev: 3,
  domainExpert: 4,
  architect: 5,
  requirementsGatherer: 6,
};

/** Default priority for agents not listed in AGENT_PRIORITY. */
export const DEFAULT_PRIORITY = 10;
