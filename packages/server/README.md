# @crewline/server

HTTP server for the Crewline orchestrator. This is an **infrastructure layer** package — it receives GitHub webhooks, verifies their signatures, matches events to configured agents, and enqueues jobs for the worker.

## Public API

### Functions

#### `startServer(options)`

Boots the full server: loads config, creates the Hono app, connects to Redis, and starts listening for webhooks.

```typescript
async function startServer(options: StartServerOptions): Promise<{ server: Server; queue: Queue }>
```

#### `createApp(options)`

Creates the Hono application with two routes:

- `GET /health` — health check endpoint
- `POST /webhooks/github` — receives GitHub webhook payloads, verifies signatures, and delegates to the `onEvent` callback

```typescript
function createApp(options: AppOptions): HonoApp
```

#### `matchAgents(agents, eventName, payload)`

Matches an incoming webhook event against all configured agents. Returns tuples of `[agentKey, AgentConfig]` for every agent whose trigger matches the event name, action, and optional label filter.

```typescript
function matchAgents(
  agents: Record<string, AgentConfig>,
  eventName: GitHubEventName,
  payload: Record<string, unknown>,
): Array<[string, AgentConfig]>
```

#### `verifyGitHubSignature(body, signatureHeader, secret)`

Validates a GitHub webhook HMAC SHA-256 signature.

```typescript
async function verifyGitHubSignature(body: string, signatureHeader: string, secret: string): Promise<boolean>
```

### Types

| Type | Description |
|------|-------------|
| `StartServerOptions` | `config` (CrewlineConfig), optional `redisUrl` (default: `redis://localhost:6379`), optional `port` (default: `3000`) |
| `AppOptions` | `webhookSecret` (string), `onEvent` callback |
| `WebhookEvent` | `eventName` (GitHubEventName) and `payload` (webhook body) |

## Usage Examples

### Starting the server

```typescript
import { startServer } from "@crewline/server";
import config from "./crewline.config.js";

const { server, queue } = await startServer({
  config,
  redisUrl: "redis://localhost:6379",
  port: 3000,
});
```

### Using the app directly (e.g., in tests)

```typescript
import { createApp } from "@crewline/server";

const app = createApp({
  webhookSecret: "my-secret",
  onEvent: async (event) => {
    console.log(`Received ${event.eventName}`);
  },
});
```

### Matching agents to events

```typescript
import { matchAgents } from "@crewline/server";
import type { AgentConfig, GitHubEventName } from "@crewline/shared";

const agents: Record<string, AgentConfig> = {
  triage: {
    name: "Triage Agent",
    trigger: { event: "issues.labeled", label: "bug" },
    prompt: "Triage this bug",
  },
};

const matches = matchAgents(agents, "issues", { action: "labeled", label: { name: "bug" } });
// matches: [["triage", { name: "Triage Agent", ... }]]
```

## Architecture

`@crewline/server` is an **infrastructure layer** package in the Clean Architecture:

```
Domain (@crewline/shared) → Application (@crewline/config) → Infrastructure (@crewline/server, @crewline/worker)
```

- **Depends on**: `@crewline/shared` (domain types), `@crewline/config` (validated config), `hono` (HTTP framework)
- **Never depended on by**: domain or application layer packages
- **Role**: The entry point for external events — receives GitHub webhooks and translates them into domain jobs enqueued for the worker
- **Webhook flow**: `GitHub → POST /webhooks/github → verifyGitHubSignature() → matchAgents() → enqueue jobs → Worker`
