import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
try {
  const p = require.resolve("server-only");
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} };
} catch {
  /* ignore */
}

const { migrateDatabaseSchema } = await import("../src/server/db/client.ts");

console.log("Migrando esquema en Postgres de prueba…");
const result = await migrateDatabaseSchema();
console.log(result);
if (!result.ok) process.exit(1);
