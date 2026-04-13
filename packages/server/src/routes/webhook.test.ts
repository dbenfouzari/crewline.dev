import { describe, expect, it } from "bun:test";
import { createApp } from "../app.js";
import type { HealthCheckDependencies } from "../health.js";
import type { HealthCheckResponse } from "@crewline/shared";

const SECRET = "test-secret";

async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

function makeIssuePayload(action: string, label?: string) {
  return JSON.stringify({
    action,
    issue: {
      number: 1,
      title: "Test issue",
      body: "Description",
      labels: label ? [{ id: 1, name: label, color: "000000" }] : [],
      user: { login: "test", id: 1, avatar_url: "" },
      state: "open",
    },
    ...(label ? { label: { id: 1, name: label, color: "000000" } } : {}),
    repository: {
      id: 1,
      full_name: "user/repo",
      clone_url: "https://github.com/user/repo.git",
      default_branch: "main",
    },
    sender: { login: "test", id: 1, avatar_url: "" },
  });
}

describe("POST /webhooks/github", () => {
  it("returns 401 without signature", async () => {
    const app = createApp({ webhookSecret: SECRET, onEvent: async () => {} });
    const res = await app.request("/webhooks/github", {
      method: "POST",
      headers: { "content-type": "application/json", "x-github-event": "issues" },
      body: "{}",
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid signature", async () => {
    const app = createApp({ webhookSecret: SECRET, onEvent: async () => {} });
    const body = "{}";
    const res = await app.request("/webhooks/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "issues",
        "x-hub-signature-256": "sha256=invalid",
      },
      body,
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 and calls onEvent for valid webhook", async () => {
    let receivedEvent: unknown = null;
    const app = createApp({
      webhookSecret: SECRET,
      onEvent: async (event) => {
        receivedEvent = event;
      },
    });

    const body = makeIssuePayload("labeled", "ready");
    const signature = await sign(body);

    const res = await app.request("/webhooks/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "issues",
        "x-hub-signature-256": signature,
      },
      body,
    });

    expect(res.status).toBe(200);
    expect(receivedEvent).not.toBeNull();
    expect((receivedEvent as { eventName: string }).eventName).toBe("issues");
  });
});

describe("GET /health", () => {
  it("returns 200 with status ok when healthDependencies is not provided", async () => {
    const app = createApp({ webhookSecret: SECRET, onEvent: async () => {} });
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "ok" });
  });

  it("returns 200 with full health response when all dependencies are healthy", async () => {
    const healthDependencies: HealthCheckDependencies = {
      startTime: Date.now() - 120_000,
      probeRedis: () => Promise.resolve(),
      probeDatabase: () => {},
    };
    const app = createApp({ webhookSecret: SECRET, onEvent: async () => {}, healthDependencies });
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const json = (await res.json()) as HealthCheckResponse;
    expect(json.status).toBe("ok");
    expect(json.redis).toBe("connected");
    expect(json.database).toBe("connected");
    expect(json.uptime).toBeGreaterThanOrEqual(119);
  });

  it("returns 503 with degraded status when Redis is down", async () => {
    const healthDependencies: HealthCheckDependencies = {
      startTime: Date.now() - 60_000,
      probeRedis: () => Promise.reject(new Error("Connection refused")),
      probeDatabase: () => {},
    };
    const app = createApp({ webhookSecret: SECRET, onEvent: async () => {}, healthDependencies });
    const res = await app.request("/health");
    expect(res.status).toBe(503);
    const json = (await res.json()) as HealthCheckResponse;
    expect(json.status).toBe("degraded");
    expect(json.redis).toBe("disconnected");
    expect(json.database).toBe("connected");
  });

  it("returns 503 with degraded status when database is down", async () => {
    const healthDependencies: HealthCheckDependencies = {
      startTime: Date.now() - 60_000,
      probeRedis: () => Promise.resolve(),
      probeDatabase: () => { throw new Error("Database locked"); },
    };
    const app = createApp({ webhookSecret: SECRET, onEvent: async () => {}, healthDependencies });
    const res = await app.request("/health");
    expect(res.status).toBe(503);
    const json = (await res.json()) as HealthCheckResponse;
    expect(json.status).toBe("degraded");
    expect(json.redis).toBe("connected");
    expect(json.database).toBe("disconnected");
  });
});
