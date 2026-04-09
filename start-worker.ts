/**
 * CLI entry point for the Crewline worker.
 */

import config from "./crewline.config.js";
import { startWorker } from "@crewline/worker";

await startWorker({
  config,
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
  databasePath: process.env["DATABASE_PATH"] ?? "./crewline.db",
  concurrency: 1,
});
