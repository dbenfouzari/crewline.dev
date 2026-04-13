import { describe, expect, it } from "bun:test";
import { checkHealth } from "./health.js";
import type { HealthCheckDependencies } from "./health.js";

function makeRedisProbe(connected: boolean): HealthCheckDependencies["probeRedis"] {
  return connected
    ? () => Promise.resolve()
    : () => Promise.reject(new Error("Connection refused"));
}

function makeDatabaseProbe(connected: boolean): HealthCheckDependencies["probeDatabase"] {
  return connected
    ? () => {}
    : () => {
        throw new Error("Database locked");
      };
}

function makeDependencies(
  overrides: Partial<HealthCheckDependencies> = {},
): HealthCheckDependencies {
  return {
    startTime: Date.now() - 60_000,
    probeRedis: makeRedisProbe(true),
    probeDatabase: makeDatabaseProbe(true),
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
    const result = await checkHealth(
      makeDependencies({ probeRedis: makeRedisProbe(false) }),
    );

    expect(result.status).toBe("degraded");
    expect(result.redis).toBe("disconnected");
    expect(result.database).toBe("connected");
  });

  it("returns degraded status when database is unreachable", async () => {
    const result = await checkHealth(
      makeDependencies({ probeDatabase: makeDatabaseProbe(false) }),
    );

    expect(result.status).toBe("degraded");
    expect(result.redis).toBe("connected");
    expect(result.database).toBe("disconnected");
  });

  it("returns degraded status when both dependencies are unreachable", async () => {
    const result = await checkHealth(
      makeDependencies({
        probeRedis: makeRedisProbe(false),
        probeDatabase: makeDatabaseProbe(false),
      }),
    );

    expect(result.status).toBe("degraded");
    expect(result.redis).toBe("disconnected");
    expect(result.database).toBe("disconnected");
  });

  it("computes uptime in seconds from startTime", async () => {
    const result = await checkHealth(
      makeDependencies({ startTime: Date.now() - 3_600_000 }),
    );

    expect(result.uptime).toBeGreaterThanOrEqual(3599);
    expect(result.uptime).toBeLessThanOrEqual(3601);
  });

  it("returns disconnected for Redis when probe times out", async () => {
    const neverResolves = () => new Promise<void>(() => {});

    const result = await checkHealth(
      makeDependencies({ probeRedis: neverResolves }),
    );

    expect(result.status).toBe("degraded");
    expect(result.redis).toBe("disconnected");
    expect(result.database).toBe("connected");
  });
});
