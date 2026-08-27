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
    // ioredis emite 'error' en cada hipo de red/reconexión — un EventEmitter
    // sin listener de 'error' tumba TODO el proceso Node (server.mjs, HTTP
    // incluido) ante el primer error transitorio de Redis. ioredis reintenta
    // solo; esto solo evita que el proceso entero se caiga por eso.
    connection.on("error", (err) => {
      console.error("[redis] connection error", err);
    });
  }
  return connection;
}
