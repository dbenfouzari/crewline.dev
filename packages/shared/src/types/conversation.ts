/**
 * Conversation types — domain model for agent conversation streaming and persistence.
 * A conversation is the complete exchange between the system and Claude CLI during a single job.
 * One job produces exactly one conversation, identified by jobId.
 */

/** Event types emitted by Claude CLI stream-json format */
export type ConversationEventType =
  | "assistant:text"
  | "assistant:tool_use"
  | "tool:result"
  | "system"
  | "result"
  | "error";

/**
 * A single atomic occurrence within a conversation.
 * Immutable once recorded — events are append-only.
 */
export interface ConversationEvent {
  /** Unique ID for this event */
  id: string;
  /** The job this event belongs to */
  jobId: string;
  /** Classified event type */
  type: ConversationEventType;
  /** Raw JSON payload from Claude CLI — preserved verbatim, never normalized */
  payload: Record<string, unknown>;
  /** Monotonically increasing sequence within the job — canonical ordering for replay */
  sequenceNumber: number;
  /** ISO 8601 timestamp when the event was received */
  timestamp: string;
}

/**
 * SSE wrapper for conversation events.
 * Sent alongside JobLifecycleEvent on the SSE stream.
 */
export interface ConversationSSEEvent {
  type: "conversation:event";
  event: ConversationEvent;
}

/**
 * Union of all SSE event types sent to dashboard clients.
 * Extends the existing JobLifecycleEvent with conversation streaming.
 */
export type DashboardSSEEvent =
  | import("./dashboard.js").JobLifecycleEvent
  | ConversationSSEEvent;
