/**
 * Conversation publisher — broadcasts conversation events to the server
 * via Redis pub/sub. Fire-and-forget: if the server is down, events
 * are lost from SSE but persisted in SQLite (source of truth).
 */

import Redis from "ioredis";
import type { ConnectionOptions } from "bullmq";
import type { ConversationEvent } from "@crewline/shared";

const CHANNEL_PREFIX = "crewline:conversation:";

/**
 * Builds the Redis pub/sub channel name for a given job ID.
 *
 * @param jobId - The job identifier
 * @returns The fully-qualified channel name
 */
export function buildChannelName(jobId: string): string {
  return `${CHANNEL_PREFIX}${jobId}`;
}

export interface ConversationPublisher {
  /** Publishes a conversation event to the Redis channel for its job */
  publish(event: ConversationEvent): void;
  /** Closes the Redis connection */
  close(): Promise<void>;
}

/**
 * Creates a ConversationPublisher that broadcasts events via Redis pub/sub.
 *
 * @param connection - Redis connection options (from BullMQ config)
 * @returns A ConversationPublisher instance
 */
export function createConversationPublisher(
  connection: ConnectionOptions,
): ConversationPublisher {
  const redis = new Redis({
    host: (connection as { host?: string }).host ?? "localhost",
    port: (connection as { port?: number }).port ?? 6379,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  // Connect lazily — first publish triggers connection
  let connected = false;

  return {
    publish(event: ConversationEvent): void {
      if (!connected) {
        connected = true;
        redis.connect().catch((error: unknown) => {
          console.error("[conversation-publisher] Redis connection failed:", error);
        });
      }

      const channel = buildChannelName(event.jobId);
      redis.publish(channel, JSON.stringify(event)).catch((error: unknown) => {
        console.error("[conversation-publisher] Failed to publish event:", error);
      });
    },

    async close(): Promise<void> {
      await redis.quit();
    },
  };
}
