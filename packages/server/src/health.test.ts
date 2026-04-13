import { describe, expect, it } from "bun:test";
import { checkHealth } from "./health.js";
import type { HealthCheckDependencies } from "./health.js";
import type { Database } from "bun:sqlite";

function makeStartTime(secondsAgo: number): number {
  return Date.now() - secondsAgo * 1000;
}

function makeHealthyDatabase(): Database {
  return { query: () => ({ get: () => ({ "1": 1 }) }) } as unknown as Database;
}

function makeUnhealthyDatabase(): Database {
  return {
    query: () => ({
      get: () => {
        throw new Error("database is locked");
      },
    }),
  } as unknown as Database;
}

function makeDependencies(overrides: Partial<HealthCheckDependencies> = {}): HealthCheckDependencies {
  return {
    startTime: makeStartTime(60),
    redisConnection: { host: "localhost", port: 6379 },
    database: makeHealthyDatabase(),
    ...overrides,
  };
}

describe("checkHealth", () => {
  it("returns ok status when all dependencies are healthy", async () => {
    const result = await checkHealth(makeDependencies());

    expect(result.status).toBe("ok");
    expect(result.redis).toBe("connected");
    expect(result.database).toBe("connected");
    expect(result.uptime).toBeGreaterThanOrEqual(59);
    expect(result.uptime).toBeLessThanOrEqual(61);
  });

  it("returns degraded status when Redis is unreachable", async () => {
    const result = await checkHealth(makeDependencies({
      redisConnection: { host: "invalid-host", port: 9999 },
    }));

    expect(result.status).toBe("degraded");
    expect(result.redis).toBe("disconnected");
    expect(result.database).toBe("connected");
  });

  it("returns degraded status when database is unreachable", async () => {
    const result = await checkHealth(makeDependencies({
      database: makeUnhealthyDatabase(),
    }));

    expect(result.status).toBe("degraded");
    expect(result.redis).toBe("connected");
    expect(result.database).toBe("disconnected");
  });

  it("returns degraded status when both dependencies are unreachable", async () => {
    const result = await checkHealth(makeDependencies({
      redisConnection: { host: "invalid-host", port: 9999 },
      database: makeUnhealthyDatabase(),
    }));

    expect(result.status).toBe("degraded");
    expect(result.redis).toBe("disconnected");
    expect(result.database).toBe("disconnected");
  });

  it("computes uptime in seconds from startTime", async () => {
    const result = await checkHealth(makeDependencies({
      startTime: makeStartTime(3600),
    }));

    expect(result.uptime).toBeGreaterThanOrEqual(3599);
    expect(result.uptime).toBeLessThanOrEqual(3601);
  });
});
