#!/usr/bin/env node
import postgres from "postgres";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const pattern = process.argv[2] ?? "%SMOKE-QR-IN%";
const sql = postgres(loadRailwayTestDatabaseUrl(), { max: 1, prepare: false });
const rows = await sql`
  SELECT id, conversation_id, direction, body, created_at
  FROM lead_messages
  WHERE body ILIKE ${pattern}
  ORDER BY created_at DESC
  LIMIT 10
`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
