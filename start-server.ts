/**
 * CLI entry point for the Crewline server.
 */

import config from "./crewline.config.js";
import { startServer } from "@crewline/server";

await startServer({
  config,
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
  port: Number(process.env["PORT"] ?? 3000),
});
