/**
 * Svelte store for SSE connection state and lifecycle management.
 */

import { writable } from "svelte/store";
import type { JobLifecycleEvent } from "@crewline/shared";
import { createEventSource } from "../api.js";
import { applyEvent, loadJobs } from "./jobs.js";

/**
 * Connection state between the dashboard and the server SSE endpoint.
 */
export type ConnectionState = "connecting" | "connected" | "disconnected";

/**
 * Writable store tracking the current SSE connection state.
 */
export const connectionState = writable<ConnectionState>("disconnected");

let eventSource: EventSource | null = null;
let hasConnectedBefore = false;

/**
 * Starts the SSE connection and wires up event handlers.
 * On open: sets state to "connected". On reconnect, re-fetches jobs to backfill missed events.
 * On error: sets state to "disconnected". EventSource reconnects automatically.
 * On message: parses JobLifecycleEvent and applies to the job store.
 */
export function startSSE(): void {
  if (eventSource) {
    return;
  }

  hasConnectedBefore = false;
  connectionState.set("connecting");
  eventSource = createEventSource();

  eventSource.onopen = () => {
    connectionState.set("connected");
    // On reconnect (not first connect), re-fetch to backfill events missed during disconnect.
    if (hasConnectedBefore) {
      void loadJobs();
    }
    hasConnectedBefore = true;
  };

  eventSource.onerror = () => {
    connectionState.set("disconnected");
    // EventSource reconnects automatically — onopen will fire on success.
  };

  eventSource.onmessage = (messageEvent: MessageEvent) => {
    const event = JSON.parse(messageEvent.data as string) as JobLifecycleEvent;
    applyEvent(event);
  };
}

/**
 * Stops the SSE connection and cleans up.
 */
export function stopSSE(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
    hasConnectedBefore = false;
    connectionState.set("disconnected");
  }
}
