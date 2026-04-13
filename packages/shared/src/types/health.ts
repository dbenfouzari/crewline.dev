/**
 * Health check types for the server diagnostic endpoint.
 * Used by Docker healthchecks, load balancer probes, and monitoring.
 */

/** Overall operational state of the server. */
export type HealthStatus = "ok" | "degraded";

/** Connectivity state of an external dependency. */
export type DependencyStatus = "connected" | "disconnected";

/**
 * Structured diagnostic report returned by the `/health` endpoint.
 *
 * @example
 * ```json
 * {
 *   "status": "ok",
 *   "uptime": 3600,
 *   "redis": "connected",
 *   "database": "connected"
 * }
 * ```
 */
export interface HealthCheckResponse {
  /** Overall server health — `"ok"` when all dependencies are connected, `"degraded"` otherwise. */
  status: HealthStatus;
  /** Elapsed seconds since server start. */
  uptime: number;
  /** Redis connectivity state. */
  redis: DependencyStatus;
  /** SQLite database connectivity state. */
  database: DependencyStatus;
}
