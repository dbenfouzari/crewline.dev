/**
 * CLI entry point for the Crewline worker.
 */

import config from "./crewline.config.js";
import { startWorker } from "@crewline/worker";

const { worker, history } = await startWorker({
  config,
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
  databasePath: process.env["DATABASE_PATH"] ?? "./crewline.db",
  concurrency: 1,
});

// Graceful shutdown — let the current job finish before exiting
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    console.log(`[worker] Received ${signal}, shutting down gracefully...`);
    await worker.close();
    history.close();
    process.exit(0);
  });
}
