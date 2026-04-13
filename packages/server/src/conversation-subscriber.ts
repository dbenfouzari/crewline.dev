/**
 * Conversation subscriber — receives conversation events from Redis pub/sub
 * and relays them to connected SSE clients via a callback.
 * Uses pattern subscribe (psubscribe) to listen to all job channels.
 */

import Redis from "ioredis";
import type { ConnectionOptions } from "bullmq";
import type { ConversationEvent } from "@crewline/shared";

/** Redis channel pattern for all conversation events */
export const CONVERSATION_CHANNEL_PATTERN = "crewline:conversation:*";

export interface ConversationSubscriber {
  /** Registers a callback for incoming conversation events */
  onEvent(callback: (event: ConversationEvent) => void): void;
  /** Closes the Redis connection */
  close(): Promise<void>;
}

/**
 * Creates a ConversationSubscriber that listens for events via Redis pub/sub.
 *
 * @param connection - Redis connection options (from BullMQ config)
 * @returns A ConversationSubscriber instance
 */
export function createConversationSubscriber(
  connection: ConnectionOptions,
): ConversationSubscriber {
  const redis = new Redis({
    host: (connection as { host?: string }).host ?? "localhost",
    port: (connection as { port?: number }).port ?? 6379,
    maxRetriesPerRequest: null,
  });

  const callbacks: ((event: ConversationEvent) => void)[] = [];

  redis.psubscribe(CONVERSATION_CHANNEL_PATTERN).catch((error: unknown) => {
    console.error("[conversation-subscriber] Failed to subscribe:", error);
  });

  redis.on("pmessage", (_pattern: string, _channel: string, message: string) => {
    try {
      const event = JSON.parse(message) as ConversationEvent;
      for (const callback of callbacks) {
        callback(event);
      }
    } catch (error: unknown) {
      console.error("[conversation-subscriber] Failed to parse message:", error);
    }
  });

  return {
    onEvent(callback: (event: ConversationEvent) => void): void {
      callbacks.push(callback);
    },

    async close(): Promise<void> {
      await redis.punsubscribe(CONVERSATION_CHANNEL_PATTERN);
      await redis.quit();
    },
  };
}
