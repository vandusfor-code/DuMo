import "server-only";
import Redis from "ioredis";

let connection: Redis | null = null;

export function isQueueEnabled(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

export function getRedisConnection(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!connection) {
    connection = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}
