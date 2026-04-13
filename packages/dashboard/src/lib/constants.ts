/**
 * Dashboard-level constants.
 *
 * These are UI-only values that do not belong in the domain or server config.
 * If a constant needs per-deployment customization, promote it to the server
 * config (`defineConfig()`) and expose it via an API endpoint.
 */

/**
 * Elapsed-time threshold (in milliseconds) beyond which a running stage is
 * visually flagged as stale, suggesting the worker has likely crashed.
 *
 * Default: 60 minutes. Must be a positive number.
 */
export const STALE_THRESHOLD_MS: number = 60 * 60 * 1000;
