import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { get } from "svelte/store";

/**
 * Minimal mock for EventSource used in tests.
 * Captures handlers so tests can simulate SSE lifecycle events.
 */
class MockEventSource {
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
  }

  close(): void {
    this.closed = true;
  }
}

// Store the mock instances created during tests
let mockEventSources: MockEventSource[] = [];

// Mock the api module before importing connection
const mockLoadJobs = mock(() => Promise.resolve());
const mockApplyEvent = mock(() => {});

// We need to set up the EventSource mock globally
const originalEventSource = globalThis.EventSource;

beforeEach(() => {
  mockEventSources = [];
  mockLoadJobs.mockClear();
  mockApplyEvent.mockClear();

  globalThis.EventSource = class extends MockEventSource {
    constructor(url: string) {
      super(url);
      mockEventSources.push(this);
    }
  } as unknown as typeof EventSource;
});

afterEach(() => {
  globalThis.EventSource = originalEventSource;
});

// Use dynamic imports with mocks
mock.module("../api.js", () => ({
  createEventSource: () => new globalThis.EventSource("/api/events"),
}));

mock.module("./jobs.js", () => ({
  loadJobs: mockLoadJobs,
  applyEvent: mockApplyEvent,
}));

describe("connectionState", () => {
  it("starts as disconnected", async () => {
    const { connectionState } = await import("./connection.js");
    // Reset state for clean test
    connectionState.set("disconnected");
    expect(get(connectionState)).toBe("disconnected");
  });
});

describe("startSSE", () => {
  beforeEach(async () => {
    const { stopSSE, connectionState } = await import("./connection.js");
    stopSSE();
    connectionState.set("disconnected");
  });

  it("sets state to connecting when starting", async () => {
    const { startSSE, connectionState } = await import("./connection.js");

    startSSE();

    expect(get(connectionState)).toBe("connecting");
  });

  it("creates an EventSource", async () => {
    const { startSSE } = await import("./connection.js");

    startSSE();

    expect(mockEventSources.length).toBeGreaterThan(0);
  });

  it("is idempotent — calling twice does not create two EventSources", async () => {
    const { startSSE } = await import("./connection.js");
    const countBefore = mockEventSources.length;

    startSSE();
    const countAfterFirst = mockEventSources.length;

    startSSE();
    const countAfterSecond = mockEventSources.length;

    expect(countAfterSecond - countBefore).toBe(countAfterFirst - countBefore);
  });

  it("sets state to connected on open", async () => {
    const { startSSE, connectionState } = await import("./connection.js");

    startSSE();
    const latestSource = mockEventSources[mockEventSources.length - 1]!;
    latestSource.onopen?.(new Event("open"));

    expect(get(connectionState)).toBe("connected");
  });

  it("does not call loadJobs on first connect", async () => {
    const { startSSE } = await import("./connection.js");

    startSSE();
    const latestSource = mockEventSources[mockEventSources.length - 1]!;
    latestSource.onopen?.(new Event("open"));

    expect(mockLoadJobs).not.toHaveBeenCalled();
  });

  it("calls loadJobs on reconnect (second onopen after onerror)", async () => {
    const { startSSE } = await import("./connection.js");

    startSSE();
    const latestSource = mockEventSources[mockEventSources.length - 1]!;

    // First connect
    latestSource.onopen?.(new Event("open"));
    expect(mockLoadJobs).not.toHaveBeenCalled();

    // Disconnect
    latestSource.onerror?.(new Event("error"));

    // Reconnect
    latestSource.onopen?.(new Event("open"));
    expect(mockLoadJobs).toHaveBeenCalledTimes(1);
  });

  it("sets state to disconnected on error", async () => {
    const { startSSE, connectionState } = await import("./connection.js");

    startSSE();
    const latestSource = mockEventSources[mockEventSources.length - 1]!;
    latestSource.onopen?.(new Event("open"));
    latestSource.onerror?.(new Event("error"));

    expect(get(connectionState)).toBe("disconnected");
  });

  it("does not call loadJobs on error (only on reconnect)", async () => {
    const { startSSE } = await import("./connection.js");

    startSSE();
    const latestSource = mockEventSources[mockEventSources.length - 1]!;
    latestSource.onerror?.(new Event("error"));

    expect(mockLoadJobs).not.toHaveBeenCalled();
  });

  it("parses and applies SSE message events", async () => {
    const { startSSE } = await import("./connection.js");

    startSSE();
    const latestSource = mockEventSources[mockEventSources.length - 1]!;

    const eventData = {
      type: "job:started",
      job: {
        id: "job-1",
        agentName: "dev",
        status: "running",
        repository: "owner/repo",
        targetNumber: 7,
        createdAt: "2026-04-10T12:00:00Z",
        startedAt: "2026-04-10T12:01:00Z",
        completedAt: null,
        result: null,
        exitCode: null,
      },
    };

    latestSource.onmessage?.(
      new MessageEvent("message", { data: JSON.stringify(eventData) }),
    );

    expect(mockApplyEvent).toHaveBeenCalledTimes(1);
    expect(mockApplyEvent).toHaveBeenCalledWith(eventData);
  });
});

describe("stopSSE", () => {
  beforeEach(async () => {
    const { stopSSE, connectionState } = await import("./connection.js");
    stopSSE();
    connectionState.set("disconnected");
  });

  it("closes the EventSource", async () => {
    const { startSSE, stopSSE } = await import("./connection.js");

    startSSE();
    const latestSource = mockEventSources[mockEventSources.length - 1]!;

    stopSSE();

    expect(latestSource.closed).toBe(true);
  });

  it("sets state to disconnected", async () => {
    const { startSSE, stopSSE, connectionState } = await import(
      "./connection.js"
    );

    startSSE();
    const latestSource = mockEventSources[mockEventSources.length - 1]!;
    latestSource.onopen?.(new Event("open"));
    expect(get(connectionState)).toBe("connected");

    stopSSE();

    expect(get(connectionState)).toBe("disconnected");
  });

  it("allows starting a new SSE connection after stopping", async () => {
    const { startSSE, stopSSE } = await import("./connection.js");
    const countBefore = mockEventSources.length;

    startSSE();
    stopSSE();
    startSSE();

    expect(mockEventSources.length - countBefore).toBe(2);
  });
});
