import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { ConversationHistory } from "./conversation-history.js";
import type { ConversationEvent } from "@crewline/shared";

describe("ConversationHistory", () => {
  let database: Database;
  let history: ConversationHistory;

  beforeEach(() => {
    database = new Database(":memory:");
    database.run("PRAGMA journal_mode = WAL");
    history = new ConversationHistory(database);
  });

  afterEach(() => {
    database.close();
  });

  function makeEvent(overrides: Partial<ConversationEvent> = {}): ConversationEvent {
    return {
      id: crypto.randomUUID(),
      jobId: "job-1",
      type: "assistant:text",
      payload: { type: "assistant", message: { content: [{ type: "text", text: "hello" }] } },
      sequenceNumber: 0,
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  it("records and retrieves events by job ID", () => {
    const event1 = makeEvent({ sequenceNumber: 0 });
    const event2 = makeEvent({ sequenceNumber: 1, type: "assistant:tool_use" });
    history.record(event1);
    history.record(event2);

    const events = history.listByJobId("job-1");
    expect(events).toHaveLength(2);
    expect(events[0]!.sequenceNumber).toBe(0);
    expect(events[1]!.sequenceNumber).toBe(1);
  });

  it("returns events ordered by sequence number ascending", () => {
    history.record(makeEvent({ sequenceNumber: 2 }));
    history.record(makeEvent({ sequenceNumber: 0 }));
    history.record(makeEvent({ sequenceNumber: 1 }));

    const events = history.listByJobId("job-1");
    expect(events[0]!.sequenceNumber).toBe(0);
    expect(events[1]!.sequenceNumber).toBe(1);
    expect(events[2]!.sequenceNumber).toBe(2);
  });

  it("isolates events by job ID", () => {
    history.record(makeEvent({ jobId: "job-1", sequenceNumber: 0 }));
    history.record(makeEvent({ jobId: "job-2", sequenceNumber: 0 }));
    history.record(makeEvent({ jobId: "job-1", sequenceNumber: 1 }));

    expect(history.listByJobId("job-1")).toHaveLength(2);
    expect(history.listByJobId("job-2")).toHaveLength(1);
  });

  it("returns empty array for unknown job ID", () => {
    expect(history.listByJobId("nonexistent")).toHaveLength(0);
  });

  it("preserves payload as JSON", () => {
    const payload = { type: "assistant", message: { content: [{ type: "text", text: "hello world" }] } };
    history.record(makeEvent({ payload }));

    const events = history.listByJobId("job-1");
    expect(events[0]!.payload).toEqual(payload);
  });

  it("preserves event type classification", () => {
    history.record(makeEvent({ type: "assistant:text" }));
    history.record(makeEvent({ type: "assistant:tool_use", sequenceNumber: 1 }));
    history.record(makeEvent({ type: "tool:result", sequenceNumber: 2 }));
    history.record(makeEvent({ type: "error", sequenceNumber: 3 }));

    const events = history.listByJobId("job-1");
    expect(events[0]!.type).toBe("assistant:text");
    expect(events[1]!.type).toBe("assistant:tool_use");
    expect(events[2]!.type).toBe("tool:result");
    expect(events[3]!.type).toBe("error");
  });
});
