/**
 * Conversation history — SQLite-backed persistence for conversation events.
 * Shares the same Database instance as JobHistory.
 * Events are append-only and immutable once recorded.
 */

import type { Database } from "bun:sqlite";
import type { ConversationEvent, ConversationEventType } from "@crewline/shared";

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS conversation_events (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    timestamp TEXT NOT NULL
  )
`;

const CREATE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_conversation_events_job_id
    ON conversation_events(job_id, sequence_number)
`;

function rowToEvent(row: Record<string, unknown>): ConversationEvent {
  return {
    id: row["id"] as string,
    jobId: row["job_id"] as string,
    type: row["type"] as ConversationEventType,
    payload: JSON.parse(row["payload"] as string) as Record<string, unknown>,
    sequenceNumber: row["sequence_number"] as number,
    timestamp: row["timestamp"] as string,
  };
}

export class ConversationHistory {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
    this.db.run(CREATE_TABLE);
    this.db.run(CREATE_INDEX);
  }

  /**
   * Records a conversation event to the database.
   *
   * @param event - The conversation event to persist
   */
  record(event: ConversationEvent): void {
    this.db.run(
      `INSERT INTO conversation_events
       (id, job_id, type, payload, sequence_number, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.jobId,
        event.type,
        JSON.stringify(event.payload),
        event.sequenceNumber,
        event.timestamp,
      ],
    );
  }

  /**
   * Retrieves all conversation events for a job, ordered by sequence number ascending.
   *
   * @param jobId - The job ID to retrieve events for
   * @returns Ordered array of conversation events
   */
  listByJobId(jobId: string): ConversationEvent[] {
    const rows = this.db
      .query(
        "SELECT * FROM conversation_events WHERE job_id = ? ORDER BY sequence_number ASC",
      )
      .all(jobId) as Record<string, unknown>[];
    return rows.map(rowToEvent);
  }
}
