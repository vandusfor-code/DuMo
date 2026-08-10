/**
 * P2.1 — Reapertura a tipificador original (+ caso negativo tipificador offline).
 * Uso: npx tsx --env-file=.env.local scripts/verify-p21-reopen-original-advisor.ts
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

async function loadLeadsService() {
  await stubServerOnly();
  return import("../src/services/leads.service.ts");
}

async function findClosedWithTipifier(sql: postgres.Sql, carolinaId: string) {
  const rows = await sql`
    SELECT c.id, c.customer_name, c.inbox_state, c.reopened_at
    FROM lead_conversations c
    JOIN lead_gestiones g ON g.conversation_id = c.id
    WHERE c.inbox_state = 'closed'
      AND g.advisor_id = ${carolinaId}
    ORDER BY g.created_at DESC
    LIMIT 1
  `;
  return rows[0] as
    | { id: string; customer_name: string; inbox_state: string; reopened_at: string | null }
    | undefined;
}

async function main() {
  const { maybeReopenClosedConversationOnInbound } = await loadReopenService();
  const { migrateDatabaseSchema } = await import("../src/server/db/client.ts");
  await migrateDatabaseSchema();

  if (!DATABASE_URL) throw new Error("DATABASE_URL requerido");
  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

  try {
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'lead_conversations' AND column_name = 'reopened_at'
    `;
    assert(cols.length === 1, "columna lead_conversations.reopened_at existe");

    const carolina = await sql`
      SELECT id, username FROM users WHERE username = 'Carolina.wom' LIMIT 1
    `;
    if (!carolina[0]) throw new Error("Carolina.wom no encontrada");
    const carolinaId = carolina[0].id as string;

    const closedNeg = await findClosedWithTipifier(sql, carolinaId);
    if (!closedNeg) {
      console.log("SKIP: sin conversación cerrada tipificada por Carolina");
      return;
    }
    const negConvId = closedNeg.id;

    console.log("\n--- Caso negativo P2.2: tipificador offline, nadie más disponible → pending ---");

    await sql`
      UPDATE users
      SET presence_status = 'desconectado', last_seen_at = now() - interval '15 minutes'
      WHERE role = 'asesora' AND active = true
    `;

    const pendingConv = `webqr:57395${String(Date.now()).slice(-7)}`;
    await sql`
      INSERT INTO lead_conversations (
        id, phone, customer_name, last_message, last_message_at, unread, status, online, inbox_state,
        assigned_advisor_id, assigned_advisor_name, admin_status
      ) VALUES (
        ${pendingConv}, ${pendingConv.replace("webqr:", "")}, 'P21 pending', 'x', now(), 0, 'new', false, 'closed',
        ${carolinaId}, ${carolina[0].name ?? "Carolina"}, 'asignado'
      )
      ON CONFLICT (id) DO UPDATE SET inbox_state = 'closed', reopened_at = NULL
    `;
    await sql`
      INSERT INTO lead_gestiones (
        id, conversation_id, phone, customer_name, rut, gestion_type, notes,
        advisor_id, advisor_name, lines, created_at
      ) VALUES (
        ${`GEST-P21-P-${Date.now()}`}, ${pendingConv}, ${pendingConv.replace("webqr:", "")},
        'P21 pending', '11111111-1', 'consulta', '', ${carolinaId}, 'Carolina', '[]', now()
      )
    `;

    const offline = await maybeReopenClosedConversationOnInbound(pendingConv);
    assert(offline.reopened === true && offline.assignVia === "pending", "nadie disponible → pending");
    const afterOffline = await sql`
      SELECT inbox_state, reopened_at, assigned_advisor_id FROM lead_conversations WHERE id = ${pendingConv} LIMIT 1
    `;
    assert(afterOffline[0]?.inbox_state === "active", "pending: active (no closed silencioso)");
    assert(afterOffline[0]?.assigned_advisor_id == null, "pending: sin asesora hasta auto-assign");

    console.log("\n--- Caso negativo legacy: receiveMessage persiste con tipificador offline ---");
    await sql`
      UPDATE lead_conversations SET inbox_state = 'closed', reopened_at = NULL, assigned_advisor_id = ${carolinaId}
      WHERE id = ${negConvId}
    `;
    await sql`
      UPDATE users SET presence_status = 'desconectado', last_seen_at = now() - interval '15 minutes'
      WHERE role = 'asesora' AND active = true
    `;
    const { leadsService } = await loadLeadsService();
    const msgCountBefore = await sql`
      SELECT count(*)::int AS n FROM lead_messages WHERE conversation_id = ${negConvId}
    `;
    await leadsService.receiveMessage({
      conversationId: negConvId,
      waMessageId: `p21-neg-${Date.now()}`,
      direction: "in",
      body: "P2.1 verify — mensaje con tipificador offline",
      createdAt: new Date().toISOString(),
      phone: "+56900000001",
      customerName: closedNeg.customer_name ?? "Test",
    });
    const msgCountAfter = await sql`
      SELECT count(*)::int AS n FROM lead_messages WHERE conversation_id = ${negConvId}
    `;
    const afterMsg = await sql`
      SELECT inbox_state FROM lead_conversations WHERE id = ${negConvId} LIMIT 1
    `;
    assert(
      (msgCountAfter[0]?.n ?? 0) > (msgCountBefore[0]?.n ?? 0),
      "mensaje entrante se persiste aunque no reabra",
    );
    assert(afterMsg[0]?.inbox_state === "active", "receiveMessage con RR/pending: active (no closed silencioso)");

    await sql`
      UPDATE users SET presence_status = 'disponible', last_seen_at = now() WHERE id = ${carolinaId}
    `;

    console.log("\n--- Caso positivo P2.1: tipificador disponible ---");

    const closedPos =
      (await findClosedWithTipifier(sql, carolinaId)) ??
      (negConvId === closedNeg.id && afterMsg[0]?.inbox_state === "closed"
        ? closedNeg
        : undefined);

    let posConvId: string;
    if (closedPos && closedPos.id !== negConvId) {
      posConvId = closedPos.id;
    } else if (afterMsg[0]?.inbox_state === "closed") {
      posConvId = negConvId;
    } else {
      const anyClosed = await sql`
        SELECT c.id FROM lead_conversations c
        JOIN lead_gestiones g ON g.conversation_id = c.id
        WHERE c.inbox_state = 'closed' AND g.advisor_id = ${carolinaId}
        ORDER BY g.created_at DESC LIMIT 1
      `;
      if (!anyClosed[0]) {
        console.log("SKIP positivo: no quedó conversación closed para probar reopen");
        return;
      }
      posConvId = anyClosed[0].id as string;
    }

    await sql`
      UPDATE users
      SET presence_status = 'disponible', last_seen_at = now()
      WHERE id = ${carolinaId}
    `;

    const result = await maybeReopenClosedConversationOnInbound(posConvId);
    assert(
      result.reopened === true && result.assignVia === "original-tipifier",
      `reopen ${posConvId} → ${result.advisorId} via ${result.assignVia}`,
    );

    const row = await sql`
      SELECT inbox_state, reopened_at, assigned_advisor_id
      FROM lead_conversations WHERE id = ${posConvId} LIMIT 1
    `;
    assert(row[0]?.inbox_state === "active", "inbox_state = active tras reopen");
    assert(row[0]?.reopened_at != null, "reopened_at establecido");
    assert(row[0]?.assigned_advisor_id === carolinaId, "reasignada a Carolina");

    const second = await maybeReopenClosedConversationOnInbound(posConvId);
    assert(
      second.reopened === false && second.reason === "not-closed",
      "segundo intento no reabre (ya active)",
    );

    await sql`
      UPDATE users
      SET presence_status = 'disponible', last_seen_at = now()
      WHERE id = ${carolinaId}
    `;

    if (!process.exitCode) {
      console.log("\nOK — P2.1 positivo + negativo (offline → closed sin romper).");
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
