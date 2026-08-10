/**
 * P2.2 — Round-robin fallback cuando tipificador no está disponible.
 * Uso: npx tsx --env-file=.env.local scripts/verify-p22-round-robin-fallback.ts
 */

import { createRequire } from "node:module";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL1?.trim() ?? process.env.DATABASE_URL?.trim();

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("OK:", message);
  }
}

async function stubServerOnly() {
  const require = createRequire(import.meta.url);
  try {
    const p = require.resolve("server-only");
    require.cache[p] = { id: p, filename: p, loaded: true, exports: {} };
  } catch {
    /* ignore */
  }
}

async function loadReopenService() {
  await stubServerOnly();
  return import("../src/services/inbox-reopen.service.ts");
}

async function main() {
  const { maybeReopenClosedConversationOnInbound } = await loadReopenService();
  const { migrateDatabaseSchema } = await import("../src/server/db/client.ts");
  await migrateDatabaseSchema();

  if (!DATABASE_URL) throw new Error("DATABASE_URL requerido");
  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

  try {
    const carolina = await sql`
      SELECT id, name, username FROM users WHERE username = 'Carolina.wom' LIMIT 1
    `;
    if (!carolina[0]) throw new Error("Carolina.wom no encontrada");
    const carolinaId = carolina[0].id as string;

    const fallback = await sql`
      SELECT id, name, username, token_version FROM users
      WHERE role = 'asesora' AND active = true AND id <> ${carolinaId}
      ORDER BY last_seen_at DESC NULLS LAST
      LIMIT 1
    `;
    if (!fallback[0]) throw new Error("Se necesita otra asesora activa para round-robin");
    const fallbackId = fallback[0].id as string;

    const phone = `57398${String(Date.now()).slice(-7)}`;
    const convId = `webqr:${phone}`;
    const customerName = "P2.2 RR unit test";

    await sql`
      INSERT INTO lead_conversations (
        id, phone, customer_name, last_message, last_message_at, unread, status, online, inbox_state,
        assigned_advisor_id, assigned_advisor_name, admin_status
      ) VALUES (
        ${convId}, ${phone}, ${customerName}, 'cerrado', now(), 0, 'new', false, 'closed',
        ${carolinaId}, ${carolina[0].name}, 'asignado'
      )
      ON CONFLICT (id) DO UPDATE SET inbox_state = 'closed', reopened_at = NULL,
        assigned_advisor_id = EXCLUDED.assigned_advisor_id
    `;
    await sql`
      INSERT INTO lead_gestiones (
        id, conversation_id, phone, customer_name, rut, gestion_type, notes,
        advisor_id, advisor_name, lines, created_at
      ) VALUES (
        ${`GEST-P22-${Date.now()}`}, ${convId}, ${phone}, ${customerName}, '11111111-1', 'consulta',
        'P2.2 unit', ${carolinaId}, ${carolina[0].name}, '[]', now()
      )
    `;

    console.log("\n--- P2.2 round-robin: tipificador offline, fallback disponible ---");

    await sql`
      UPDATE users SET presence_status = 'desconectado', last_seen_at = now() - interval '15 minutes'
      WHERE role = 'asesora' AND active = true
    `;
    await sql`
      UPDATE users SET presence_status = 'disponible', last_seen_at = now()
      WHERE id = ${fallbackId}
    `;

    const result = await maybeReopenClosedConversationOnInbound(convId);
    assert(result.reopened === true, "reopened=true");
    assert(result.assignVia === "round-robin", `assignVia=round-robin (got ${result.assignVia})`);
    assert(result.advisorId === fallbackId, `asignada a fallback ${fallback[0].username} (got ${result.advisorId})`);

    const row = await sql`
      SELECT inbox_state, reopened_at, assigned_advisor_id
      FROM lead_conversations WHERE id = ${convId}
    `;
    assert(row[0]?.inbox_state === "active", "inbox_state=active");
    assert(row[0]?.reopened_at != null, "reopened_at set");
    assert(row[0]?.assigned_advisor_id === fallbackId, "DB assigned to fallback");

    console.log("\n--- P2.2 pending: nadie disponible ---");

    const phone2 = `57397${String(Date.now()).slice(-7)}`;
    const convId2 = `webqr:${phone2}`;
    await sql`
      INSERT INTO lead_conversations (
        id, phone, customer_name, last_message, last_message_at, unread, status, online, inbox_state,
        assigned_advisor_id, assigned_advisor_name, admin_status
      ) VALUES (
        ${convId2}, ${phone2}, 'P2.2 pending', 'cerrado', now(), 0, 'new', false, 'closed',
        ${carolinaId}, ${carolina[0].name}, 'asignado'
      )
    `;
    await sql`
      INSERT INTO lead_gestiones (
        id, conversation_id, phone, customer_name, rut, gestion_type, notes,
        advisor_id, advisor_name, lines, created_at
      ) VALUES (
        ${`GEST-P22-P-${Date.now()}`}, ${convId2}, ${phone2}, 'P2.2 pending', '11111111-1', 'consulta',
        'P2.2 pending', ${carolinaId}, ${carolina[0].name}, '[]', now()
      )
    `;

    await sql`
      UPDATE users SET presence_status = 'desconectado', last_seen_at = now() - interval '15 minutes'
      WHERE role = 'asesora' AND active = true
    `;

    const pending = await maybeReopenClosedConversationOnInbound(convId2);
    assert(pending.reopened === true, "pending reopened=true");
    assert(pending.assignVia === "pending", `assignVia=pending (got ${pending.assignVia})`);
    assert(pending.advisorId == null, "advisorId null cuando nadie disponible");

    const row2 = await sql`
      SELECT inbox_state, reopened_at, assigned_advisor_id FROM lead_conversations WHERE id = ${convId2}
    `;
    assert(row2[0]?.inbox_state === "active", "pending: inbox_state=active");
    assert(row2[0]?.assigned_advisor_id == null, "pending: sin asesora asignada");

    await sql`
      UPDATE users SET presence_status = 'disponible', last_seen_at = now()
      WHERE id IN (${carolinaId}, ${fallbackId})
    `;

    if (!process.exitCode) {
      console.log("\nOK — P2.2 round-robin + pending sin asesoras.");
    } else {
      process.exit(1);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
