# Crewline.dev — Project Standards

## What is this?

Self-hosted, webhook-driven AI agent orchestrator for development workflows. Uses Claude Code CLI with a Max subscription — no API key, zero cost.

## Tech Stack

- **Runtime**: Bun
- **Monorepo**: Bun workspaces
- **API**: Hono
- **Queue**: BullMQ + Redis
- **Database**: bun:sqlite (WAL mode) for persistence/history
- **Validation**: Zod
- **Tests**: bun:test, TDD approach
- **TypeScript**: v6, strictest config

## Structure

```
packages/
  shared/    → Domain types — the contract between all packages
  config/    → defineConfig() + Zod validation schema
  server/    → Hono API, GitHub webhook handler, event router
  worker/    → BullMQ job queue, SQLite job history, Claude CLI executor
```

## Commands

```bash
bun test --recursive     # Run all tests
bun run typecheck        # TypeScript strict check
bun run dev:server       # Start server (watch mode)
bun run dev:worker       # Start worker (watch mode)
```

---

## Architecture Principles

### Clean Architecture

This project follows Clean Architecture. Dependencies point inward — outer layers depend on inner layers, never the reverse.

```
Domain (shared/) → Application (config/, business logic) → Infrastructure (server/, worker/)
```

- **Domain layer** (`@crewline/shared`): Pure types, interfaces, domain rules. Zero dependencies. This is the core — it defines what the system IS, not how it runs.
- **Application layer**: Use cases, orchestration logic, configuration validation. Depends only on domain.
- **Infrastructure layer**: HTTP server, queue, database, CLI execution. Depends on domain and application.

**Rules:**
- Never import from infrastructure in the domain layer
- Business logic must not depend on Hono, BullMQ, SQLite, or any framework
- If you need a new dependency in `shared/`, stop and reconsider — it should almost never happen

### Domain-Driven Design

- Use **ubiquitous language** consistently: the same term in code, comments, docs, and conversation
- Types in `@crewline/shared` are the domain model — they define the language of the project
- Name things after what they ARE in the domain, not what they DO technically (e.g., `AgentConfig` not `AgentSettings`, `Job` not `QueueItem`)
- When introducing a new domain concept, add it to `@crewline/shared` with a TSDoc comment explaining its role

### SOLID Principles

- **Single Responsibility**: Each module/function does one thing. A file should have one clear reason to change.
- **Open/Closed**: Extend behavior through configuration and composition, not by modifying existing code. The agent pipeline is driven by config, not hardcoded.
- **Liskov Substitution**: If you define an interface, any implementation must be fully substitutable.
- **Interface Segregation**: Keep interfaces small and focused. Don't force consumers to depend on methods they don't use.
- **Dependency Inversion**: High-level modules define interfaces; low-level modules implement them. The worker doesn't depend on BullMQ directly — it depends on abstractions.

---

## Code Quality Standards

### TypeScript

- TypeScript 6, strictest config (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.)
- All domain types go in `@crewline/shared` — single source of truth
- Use `import type { ... }` when importing only types
- Prefer discriminated unions over boolean flags
- No `any` — use `unknown` and narrow with type guards
- No type assertions (`as`) unless after Zod validation

### Documentation

Every public function, type, and module MUST have TSDoc:

```typescript
/**
 * Matches incoming GitHub webhook events against configured agent triggers.
 *
 * @param agents - Map of agent key to agent configuration
 * @param eventName - GitHub event name (e.g., "issues", "pull_request")
 * @param payload - Raw webhook payload
 * @returns Array of [agentKey, agentConfig] tuples for all matching agents
 */
export function matchAgents(...) { ... }
```

Each package MUST have a `README.md` explaining:
- What the package does
- Its public API
- Usage examples
- How it fits in the architecture

### Testing

- **TDD**: write tests FIRST, then implement. No exceptions.
- Tests live next to source files (`foo.ts` → `foo.test.ts`)
- Use `bun:test` (`describe`, `it`, `expect`)
- In-memory SQLite (`:memory:`) for database tests
- Test naming: `it("returns 401 when signature is invalid")` — describe behavior, not implementation
- Aim for 100% coverage on business logic. Infrastructure can be lighter.
- Integration tests that require Redis skip gracefully when unavailable

### Code Style

- No default exports (except `crewline.config.ts`)
- Use `.js` extensions in imports (ESM compatibility)
- `const` over `let`, never `var`
- Functions over classes, except for stateful services (e.g., `JobHistory`)
- Pure functions wherever possible — side effects at the edges only
- Early returns over nested conditionals
- Descriptive variable names — no abbreviations (`config` not `cfg`, `repository` not `repo`)

### Error Handling

- Fail fast with clear error messages
- Zod for all external input validation (config, webhook payloads)
- No silent swallowing of errors — log or propagate
- Use typed errors when the caller needs to distinguish failure modes

---

## Git Conventions

- **Commits**: Conventional commits — `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`
- **Branches**: `feat/<description>`, `fix/<description>`, `refactor/<description>`
- **PRs**: Reference the issue with `Closes #<number>`
- **One concern per commit**: don't mix refactoring with features
