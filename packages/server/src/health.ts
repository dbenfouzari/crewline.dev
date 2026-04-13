/**
 * Health check — probes Redis and SQLite connectivity and reports server status.
 * Used by the `/health` endpoint for Docker healthchecks, load balancers, and monitoring.
 */

import Redis from "ioredis";
import type { ConnectionOptions } from "bullmq";
import type { Database } from "bun:sqlite";
import type { HealthCheckResponse, DependencyStatus } from "@crewline/shared";

/** Timeout for Redis PING probe in milliseconds. */
const REDIS_TIMEOUT_MS = 2000;

/** Dependencies required by the health check function. */
export interface HealthCheckDependencies {
  /** Timestamp (ms) captured at server start, used to compute uptime. */
  startTime: number;
  /** Redis connection options (host/port) for creating a probe connection. */
  redisConnection: ConnectionOptions;
  /** SQLite database handle for probing with `SELECT 1`. */
  database: Database;
}

/**
 * Probes Redis connectivity by sending a PING command with a timeout.
 *
 * @param connection - Redis connection options
 * @returns `"connected"` if PING succeeds within the timeout, `"disconnected"` otherwise
 */
async function probeRedis(connection: ConnectionOptions): Promise<DependencyStatus> {
  const redis = new Redis({
    host: (connection as { host?: string }).host ?? "localhost",
    port: (connection as { port?: number }).port ?? 6379,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
    lazyConnect: true,
    connectTimeout: REDIS_TIMEOUT_MS,
  });

  try {
    await redis.connect();
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Redis PING timeout")), REDIS_TIMEOUT_MS);
    });
    const result = await Promise.race([redis.ping(), timeoutPromise]);
    clearTimeout(timeoutId!);
    return result === "PONG" ? "connected" : "disconnected";
  } catch {
    return "disconnected";
  } finally {
    redis.disconnect();
  }
}

/**
 * Probes SQLite connectivity by executing `SELECT 1`.
 *
 * @param database - The bun:sqlite Database handle
 * @returns `"connected"` if the query succeeds, `"disconnected"` otherwise
 */
function probeDatabase(database: Database): DependencyStatus {
  try {
    database.query("SELECT 1").get();
    return "connected";
  } catch {
    return "disconnected";
  }
}

/**
 * Performs a health check by probing all dependencies and computing server uptime.
 *
 * @param dependencies - Redis connection, database handle, and start timestamp
 * @returns A HealthCheckResponse with overall status and per-dependency diagnostics
 */
export async function checkHealth(dependencies: HealthCheckDependencies): Promise<HealthCheckResponse> {
  const { startTime, redisConnection, database } = dependencies;

  const [redisStatus, databaseStatus] = await Promise.all([
    probeRedis(redisConnection),
    Promise.resolve(probeDatabase(database)),
  ]);

  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const status = redisStatus === "connected" && databaseStatus === "connected" ? "ok" : "degraded";

  return { status, uptime, redis: redisStatus, database: databaseStatus };
}
