import { Hono } from "hono";
import { cors } from "hono/cors";
import type { GitHubEventName } from "@crewline/shared";
import { verifyGitHubSignature } from "./middleware/github-signature.js";
import { checkHealth } from "./health.js";
import type { HealthCheckDependencies } from "./health.js";
import type { createDashboardRoutes } from "./routes/dashboard.js";

export interface WebhookEvent {
  eventName: GitHubEventName;
  payload: Record<string, unknown>;
}

export interface AppOptions {
  webhookSecret: string;
  onEvent: (event: WebhookEvent) => Promise<void>;
  /** Optional dashboard routes sub-app (mounted when provided) */
  dashboardRoutes?: ReturnType<typeof createDashboardRoutes>;
  /** Optional health check dependencies — when provided, `/health` probes Redis and SQLite. */
  healthDependencies?: HealthCheckDependencies;
}

export function createApp(options: AppOptions) {
  const app = new Hono();

  app.use("*", cors());

  app.get("/health", async (c) => {
    if (!options.healthDependencies) {
      return c.json({ status: "ok" });
    }
    const response = await checkHealth(options.healthDependencies);
    const statusCode = response.status === "ok" ? 200 : 503;
    return c.json(response, statusCode);
  });

  app.post("/webhooks/github", async (c) => {
    const body = await c.req.text();
    const signature = c.req.header("x-hub-signature-256") ?? "";
    const eventName = c.req.header("x-github-event") as GitHubEventName | undefined;

    const valid = await verifyGitHubSignature(body, signature, options.webhookSecret);
    if (!valid) {
      return c.json({ error: "Invalid signature" }, 401);
    }

    if (!eventName) {
      return c.json({ error: "Missing x-github-event header" }, 400);
    }

    const payload = JSON.parse(body) as Record<string, unknown>;
    await options.onEvent({ eventName, payload });

    return c.json({ received: true });
  });

  if (options.dashboardRoutes) {
    app.route("/", options.dashboardRoutes);
  }

  return app;
}
