# Crewline.dev

Self-hosted, webhook-driven AI agent orchestrator for development workflows. Receives GitHub webhooks, matches events to configured agents, and executes [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) — using a Max subscription with no API key and zero cost.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | [Bun](https://bun.sh) |
| Monorepo | Bun workspaces |
| API | [Hono](https://hono.dev) |
| Queue | [BullMQ](https://docs.bullmq.io) + Redis |
| Database | bun:sqlite (WAL mode) |
| Validation | [Zod](https://zod.dev) |
| Language | TypeScript v6 (strictest config) |
| Tests | bun:test (TDD) |

## Prerequisites

- [Bun](https://bun.sh) v1.1+
- [Redis](https://redis.io) (for BullMQ job queue)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) with a Max subscription

## Getting Started

```bash
# Clone the repository
git clone https://github.com/dbenfouzari/crewline.dev.git
cd crewline.dev

# Install dependencies
bun install

# Copy and edit your configuration
cp crewline.config.example.ts crewline.config.ts
# Edit crewline.config.ts with your GitHub webhook secret, repos, and agents

# Start the server and worker (in separate terminals)
bun run dev:server
bun run dev:worker

# Start the dashboard
bun run dev:dashboard
```

## Commands

```bash
bun test --recursive     # Run all tests
bun run typecheck        # TypeScript strict check
bun run dev:server       # Start server (watch mode)
bun run dev:worker       # Start worker (watch mode)
bun run dev:dashboard    # Start dashboard (dev mode)
```

## Monorepo Structure

```
packages/
  shared/    → Domain types — the contract between all packages
  config/    → defineConfig() + Zod validation schema
  server/    → Hono API, GitHub webhook handler, event router
  worker/    → BullMQ job queue, SQLite job history, Claude CLI executor
  dashboard/ → Web UI for monitoring pipelines and job history
```

| Package | Layer | Description | README |
|---------|-------|-------------|--------|
| [`shared`](packages/shared) | Domain | Pure types, interfaces, domain rules — zero dependencies | [README](packages/shared/README.md) |
| [`config`](packages/config) | Application | `defineConfig()` + Zod validation schema | [README](packages/config/README.md) |
| [`server`](packages/server) | Infrastructure | Hono API, GitHub webhook handler, event router | [README](packages/server/README.md) |
| [`worker`](packages/worker) | Infrastructure | BullMQ job queue, SQLite job history, Claude CLI executor | [README](packages/worker/README.md) |
| [`dashboard`](packages/dashboard) | Infrastructure | Web UI for monitoring pipelines and job history | — |

## Architecture

Crewline follows **Clean Architecture**. Dependencies point inward — outer layers depend on inner layers, never the reverse.

```
Domain (shared/) → Application (config/) → Infrastructure (server/, worker/, dashboard/)
```

- **Domain layer** (`@crewline/shared`) — Pure types and interfaces. Defines the ubiquitous language of the system: Agent, Job, Trigger, Pipeline. Zero dependencies.
- **Application layer** (`@crewline/config`) — Configuration validation with Zod. Transforms raw user input into validated domain objects.
- **Infrastructure layer** (`@crewline/server`, `@crewline/worker`, `@crewline/dashboard`) — HTTP server, job queue, CLI execution, and web UI. All framework dependencies live here.

### Webhook Pipeline

```
GitHub → POST /webhooks/github → verifySignature() → matchAgents() → enqueue job → Worker → Claude CLI → JobHistory
```

1. GitHub sends a webhook to the server
2. The server verifies the HMAC signature and matches the event against configured agent triggers
3. Matching agents are enqueued as jobs via BullMQ + Redis
4. The worker picks up the job, spawns a Claude CLI subprocess, and records the result in SQLite

## Contributing

See [`CLAUDE.md`](CLAUDE.md) for development standards, architecture principles, code style, and testing guidelines.

## License

Private — all rights reserved.
