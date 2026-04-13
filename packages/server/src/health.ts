/**
 * Health check — probes Redis and SQLite connectivity and reports server status.
 * Used by the `/health` endpoint for Docker healthchecks, load balancers, and monitoring.
 */

import type { HealthCheckResponse, DependencyStatus } from "@crewline/shared";

/** Timeout for Redis PING probe in milliseconds. */
const REDIS_PROBE_TIMEOUT_MS = 2000;

/** Dependencies required by the health check function. */
export interface HealthCheckDependencies {
  /** Timestamp (ms) captured at server start, used to compute uptime. */
  startTime: number;
  /** Probes Redis connectivity (e.g., sends PING). Must resolve on success, reject on failure. */
  probeRedis: () => Promise<void>;
  /** Probes SQLite connectivity (e.g., executes SELECT 1). Must not throw on success. */
  probeDatabase: () => void;
}

/**
 * Performs a health check by probing all dependencies and computing server uptime.
 * Never throws — all probe failures are caught and reported as "disconnected".
 *
 * @param dependencies - Injected probes for Redis and SQLite, plus the server start timestamp
 * @returns A HealthCheckResponse with overall status and per-dependency diagnostics
 */
export async function checkHealth(
  dependencies: HealthCheckDependencies,
): Promise<HealthCheckResponse> {
  const uptime = Math.floor((Date.now() - dependencies.startTime) / 1000);

  const redis = await probeWithTimeout(
    dependencies.probeRedis(),
    REDIS_PROBE_TIMEOUT_MS,
  );

  const database = probeSync(dependencies.probeDatabase);

  const status = redis === "connected" && database === "connected" ? "ok" : "degraded";

  return { status, uptime, redis, database };
}

/**
 * Wraps an async probe with a timeout. Returns "connected" on success,
 * "disconnected" on failure or timeout. Clears the timer on the success path
 * to prevent leaks.
 */
async function probeWithTimeout(
  probe: Promise<void>,
  timeoutMs: number,
): Promise<DependencyStatus> {
  let timeoutId: ReturnType<typeof setTimeout>;
  try {
    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Probe timed out")), timeoutMs);
    });
    await Promise.race([probe, timeout]);
    clearTimeout(timeoutId!);
    return "connected";
  } catch {
    clearTimeout(timeoutId!);
    return "disconnected";
  }
}

/**
 * Wraps a synchronous probe in try/catch. Returns "connected" on success,
 * "disconnected" on throw.
 */
function probeSync(probe: () => void): DependencyStatus {
  try {
    probe();
    return "connected";
  } catch {
    return "disconnected";
  }
}
