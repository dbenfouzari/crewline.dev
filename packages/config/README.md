# @crewline/config

Configuration validation for the Crewline orchestrator. This is the **application layer** — it validates and transforms the user's `CrewlineConfig` using Zod, ensuring correctness before the system starts.

## Public API

### Functions

#### `defineConfig(config)`

The primary entry point for users writing a `crewline.config.ts`. Validates the configuration against the Zod schema and returns a typed `CrewlineConfig`.

```typescript
function defineConfig(raw: ValidatedConfig): CrewlineConfig
```

Throws `ZodError` if the configuration is invalid.

### Schemas

#### `configSchema`

The Zod schema that validates the full `CrewlineConfig` structure:

- `github.webhookSecret` — non-empty string
- `github.repos` — non-empty array of repository identifiers
- `agents` — non-empty record of `AgentConfig` objects, each with validated `trigger`, `prompt`, and optional `onSuccess`/`onFailure`/`onComplete` actions
- `board.columns` — array of at least 2 column names

### Types

#### `ValidatedConfig`

Zod-inferred type from `configSchema`. Structurally matches `CrewlineConfig` with validation guarantees.

## Usage Examples

### Writing a configuration file

```typescript
// crewline.config.ts
import { defineConfig } from "@crewline/config";

export default defineConfig({
  github: {
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
    repos: ["myorg/myrepo"],
  },
  agents: {
    triage: {
      name: "Triage Agent",
      trigger: { event: "issues.labeled", label: "bug" },
      prompt: "Triage this bug report and assign priority",
    },
    reviewer: {
      name: "Code Reviewer",
      trigger: { event: "pull_request.opened" },
      prompt: "Review this pull request for quality and correctness",
      onComplete: { comment: true },
    },
  },
  board: {
    columns: ["backlog", "in-progress", "review", "done"],
  },
});
```

### Validating config programmatically

```typescript
import { configSchema } from "@crewline/config";

const result = configSchema.safeParse(rawConfig);
if (!result.success) {
  console.error("Invalid config:", result.error.format());
}
```

## Architecture

`@crewline/config` is the **application layer** in the Clean Architecture:

```
Domain (@crewline/shared) → Application (@crewline/config) → Infrastructure (@crewline/server, @crewline/worker)
```

- **Depends on**: `@crewline/shared` (domain types), `zod` (validation)
- **Depended on by**: `@crewline/server` and `@crewline/worker` (they load and validate config at startup)
- **Role**: Transforms raw user input into validated domain objects — the boundary between what the user writes and what the system trusts
