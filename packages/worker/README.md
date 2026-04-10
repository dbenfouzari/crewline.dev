# @crewline/worker

Job processing engine for the Crewline orchestrator. This is an **infrastructure layer** package — it consumes jobs from the BullMQ queue, executes Claude CLI agents, and records results in SQLite.

## Public API

### Functions

#### `startWorker(options)`

Boots the full worker: creates a BullMQ job consumer, initializes SQLite history, and starts processing jobs.

```typescript
async function startWorker(options: StartWorkerOptions): Promise<{ worker: Worker; history: JobHistory }>
```

#### `createJobQueue(connection)`

Creates a queue wrapper for enqueuing jobs.

```typescript
function createJobQueue(connection: ConnectionOptions): {
  enqueue(newJob: NewJob): Promise<string>;
  close(): Promise<void>;
  raw: BullMQQueue;
}
```

#### `createJobWorker(connection, processor, options?)`

Creates a BullMQ worker that processes jobs from the queue.

```typescript
function createJobWorker(
  connection: ConnectionOptions,
  processor: JobProcessor,
  options?: { concurrency?: number },
): BullMQWorker
```

#### `executeAgent(options)`

Spawns a Claude CLI subprocess to execute an agent's prompt.

```typescript
async function executeAgent(options: ExecutorOptions): Promise<ExecutorResult>
```

#### `buildClaudeArgs(options)`

Builds the command-line arguments for the Claude CLI invocation.

```typescript
function buildClaudeArgs(options: ExecutorOptions): string[]
// Returns: ["--print", "--dangerously-skip-permissions", prompt]
```

### Classes

#### `JobHistory`

Persistent record of all job executions, stored in SQLite (WAL mode).

```typescript
class JobHistory {
  constructor(path: string);
  record(job: Job): void;
  getById(id: string): Job | null;
  listByStatus(status: JobStatus): Job[];
  listRecent(limit?: number): Job[];  // default: 50
  close(): void;
}
```

### Types

| Type | Description |
|------|-------------|
| `StartWorkerOptions` | `config`, optional `redisUrl`, `databasePath` (default: `./crewline.db`), `workspacePath` (default: `/tmp/crewline-workspaces`), `concurrency` (default: `1`) |
| `QueueJobData` | `agentName`, `payload` (JSON string), `repository`, `targetNumber` |
| `JobProcessor` | `(data: QueueJobData) => Promise<{ exitCode: number; result: string }>` |
| `ExecutorOptions` | `prompt`, `workDir` |
| `ExecutorResult` | `exitCode`, `stdout`, `stderr` |

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `QUEUE_NAME` | `"crewline-jobs"` | BullMQ queue name shared between server (producer) and worker (consumer) |

## Usage Examples

### Starting the worker

```typescript
import { startWorker } from "@crewline/worker";
import config from "./crewline.config.js";

const { worker, history } = await startWorker({
  config,
  redisUrl: "redis://localhost:6379",
  databasePath: "./crewline.db",
  concurrency: 2,
});
```

### Enqueuing a job

```typescript
import { createJobQueue } from "@crewline/worker";

const queue = createJobQueue({ host: "localhost", port: 6379 });

const jobId = await queue.enqueue({
  agentName: "triage",
  payload: JSON.stringify(webhookPayload),
  repository: "myorg/myrepo",
  targetNumber: 42,
});
```

### Querying job history

```typescript
import { JobHistory } from "@crewline/worker";

const history = new JobHistory("./crewline.db");
const recent = history.listRecent(10);
const failed = history.listByStatus("failed");
history.close();
```

### Executing an agent directly

```typescript
import { executeAgent } from "@crewline/worker";

const result = await executeAgent({
  prompt: "Review this pull request",
  workDir: "/tmp/crewline-workspaces/myrepo",
});

console.log(result.exitCode, result.stdout);
```

## Architecture

`@crewline/worker` is an **infrastructure layer** package in the Clean Architecture:

```
Domain (@crewline/shared) → Application (@crewline/config) → Infrastructure (@crewline/server, @crewline/worker)
```

- **Depends on**: `@crewline/shared` (domain types), `@crewline/config` (validated config), `bullmq` (job queue), `ioredis` (Redis client)
- **Never depended on by**: domain or application layer packages
- **Role**: The execution engine — consumes jobs enqueued by the server, executes Claude CLI agents, and records results in `JobHistory`
- **Job flow**: `Queue → createJobWorker() → executeAgent() → Claude CLI → JobHistory.record()`
