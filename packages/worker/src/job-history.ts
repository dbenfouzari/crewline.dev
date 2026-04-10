/**
 * Job history — SQLite-backed log of all completed/failed jobs.
 * This is the persistence layer, not the active queue.
 */

import { Database } from "bun:sqlite";
import type { Job, JobStatus } from "@crewline/shared";

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS job_history (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL,
    payload TEXT NOT NULL,
    repository TEXT NOT NULL,
    target_number INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    result TEXT,
    exit_code INTEGER
  )
`;

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: row["id"] as string,
    agentName: row["agent_name"] as string,
    status: row["status"] as JobStatus,
    payload: row["payload"] as string,
    repository: row["repository"] as string,
    targetNumber: row["target_number"] as number,
    createdAt: row["created_at"] as string,
    startedAt: (row["started_at"] as string) ?? null,
    completedAt: (row["completed_at"] as string) ?? null,
    result: (row["result"] as string) ?? null,
    exitCode: (row["exit_code"] as number) ?? null,
  };
}

export class JobHistory {
  private db: Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.run("PRAGMA journal_mode = WAL");
    this.db.run(CREATE_TABLE);
  }

  record(job: Job): void {
    this.db.run(
      `INSERT OR REPLACE INTO job_history
       (id, agent_name, status, payload, repository, target_number, created_at, started_at, completed_at, result, exit_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job.id,
        job.agentName,
        job.status,
        job.payload,
        job.repository,
        job.targetNumber,
        job.createdAt,
        job.startedAt,
        job.completedAt,
        job.result,
        job.exitCode,
      ],
    );
  }

  getById(id: string): Job | null {
    const row = this.db.query("SELECT * FROM job_history WHERE id = ?").get(id) as Record<
      string,
      unknown
    > | null;
    return row ? rowToJob(row) : null;
  }

  listByStatus(status: JobStatus): Job[] {
    const rows = this.db
      .query("SELECT * FROM job_history WHERE status = ? ORDER BY created_at DESC")
      .all(status) as Record<string, unknown>[];
    return rows.map(rowToJob);
  }

  /**
   * Returns all jobs ordered by createdAt descending.
   *
   * @returns All jobs in the history
   */
  listAll(): Job[] {
    const rows = this.db
      .query("SELECT * FROM job_history ORDER BY created_at DESC")
      .all() as Record<string, unknown>[];
    return rows.map(rowToJob);
  }

  /**
   * Returns all jobs for a given issue/PR number, ordered by createdAt descending.
   *
   * @param targetNumber - The issue or PR number to filter by
   * @returns Jobs matching the target number
   */
  listByTargetNumber(targetNumber: number): Job[] {
    const rows = this.db
      .query(
        "SELECT * FROM job_history WHERE target_number = ? ORDER BY created_at DESC",
      )
      .all(targetNumber) as Record<string, unknown>[];
    return rows.map(rowToJob);
  }

  listRecent(limit: number = 50): Job[] {
    const rows = this.db
      .query("SELECT * FROM job_history ORDER BY created_at DESC LIMIT ?")
      .all(limit) as Record<string, unknown>[];
    return rows.map(rowToJob);
  }

  close(): void {
    this.db.close();
  }
}
