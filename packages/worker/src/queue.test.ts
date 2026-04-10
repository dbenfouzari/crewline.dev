import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import Redis from "ioredis";
import { createJobQueue, createJobWorker, QUEUE_NAME } from "./queue.js";

/**
 * Integration tests — require a running Redis instance.
 * Skipped if REDIS_URL is not set or Redis is unreachable.
 */

let redis: Redis | null = null;
let redisAvailable = false;

beforeAll(async () => {
  try {
    redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      lazyConnect: true,
    });
    await redis.connect();
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }
});

afterAll(async () => {
  if (redis) {
    await redis.quit();
  }
});

describe("JobQueue (BullMQ)", () => {
  beforeEach(async () => {
    if (!redisAvailable) return;
    // Clean up queue between tests
    await redis!.del(`bull:${QUEUE_NAME}:id`);
    const keys = await redis!.keys(`bull:${QUEUE_NAME}:*`);
    if (keys.length > 0) {
      await redis!.del(...keys);
    }
  });

  it("enqueues a job and returns an ID", async () => {
    if (!redisAvailable) {
      console.log("⏭ Skipped: Redis not available");
      return;
    }

    const queue = createJobQueue({ host: "localhost", port: 6379 });
    const id = await queue.enqueue({
      agentName: "dev",
      payload: '{"action":"labeled"}',
      repository: "user/repo",
      targetNumber: 1,
      issueNumber: null,
    });

    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    await queue.close();
  });

  it("getActiveJobKeys returns keys of waiting jobs", async () => {
    if (!redisAvailable) {
      console.log("⏭ Skipped: Redis not available");
      return;
    }

    const queue = createJobQueue({ host: "localhost", port: 6379 });
    await queue.enqueue({
      agentName: "dev",
      payload: '{"action":"labeled"}',
      repository: "user/repo",
      targetNumber: 1,
      issueNumber: null,
    });
    await queue.enqueue({
      agentName: "architect",
      payload: '{"action":"labeled"}',
      repository: "user/repo",
      targetNumber: 2,
      issueNumber: null,
    });

    const keys = await queue.getActiveJobKeys();

    expect(keys.has("dev:user/repo:1")).toBe(true);
    expect(keys.has("architect:user/repo:2")).toBe(true);
    expect(keys.size).toBe(2);
    await queue.close();
  });

  it("worker processes enqueued jobs", async () => {
    if (!redisAvailable) {
      console.log("⏭ Skipped: Redis not available");
      return;
    }

    const connection = { host: "localhost", port: 6379 };
    const queue = createJobQueue(connection);

    let processedData: unknown = null;
    const worker = createJobWorker(connection, async (data) => {
      processedData = data;
      return { exitCode: 0, result: "done" };
    });

    await queue.enqueue({
      agentName: "dev",
      payload: '{"action":"labeled"}',
      repository: "user/repo",
      targetNumber: 42,
      issueNumber: null,
    });

    // Wait for worker to pick up the job
    await new Promise<void>((resolve) => {
      worker.on("completed", () => resolve());
      setTimeout(() => resolve(), 3000);
    });

    expect(processedData).not.toBeNull();
    expect((processedData as { agentName: string }).agentName).toBe("dev");
    expect((processedData as { targetNumber: number }).targetNumber).toBe(42);

    await worker.close();
    await queue.close();
  });
});
