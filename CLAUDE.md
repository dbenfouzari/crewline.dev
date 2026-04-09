# Crewline.dev — Project Conventions

## What is this?

AI agent orchestrator for development workflows. Self-hosted, webhook-driven, uses Claude Code CLI with Max subscription.

## Tech Stack

- **Runtime**: Bun
- **Monorepo**: Bun workspaces
- **API**: Hono
- **Database**: bun:sqlite (WAL mode)
- **Frontend**: React + Vite (future)
- **Validation**: Zod
- **Tests**: bun:test, TDD approach

## Structure

```
packages/
  shared/    → Types partagés (contrat entre packages)
  config/    → defineConfig() + validation Zod
  server/    → API Hono, webhook GitHub, routing events
  worker/    → Queue SQLite, executor Claude CLI
```

## Commands

```bash
bun test --recursive     # Run all tests
bun run typecheck        # TypeScript strict check
bun run dev:server       # Start server (watch mode)
bun run dev:worker       # Start worker (watch mode)
```

## Conventions

### TypeScript

- TypeScript 6, strictest possible config (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.)
- All types go in `@crewline/shared` — it's the single source of truth
- Use `type` imports (`import type { ... }`) when importing only types

### Testing

- **TDD**: write tests before implementation
- Tests live next to source files (`foo.ts` → `foo.test.ts`)
- Use `bun:test` (describe, it, expect)
- In-memory SQLite (`:memory:`) for database tests

### Code Style

- No default exports
- Use `.js` extensions in imports (for ESM compatibility)
- Prefer `const` over `let`, never `var`
- Functions over classes, except for stateful services (e.g., `JobQueue`)

### Git

- Conventional commits: `feat:`, `fix:`, `test:`, `chore:`, `docs:`
- Branches: `feat/description`, `fix/description`
