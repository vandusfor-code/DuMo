#!/usr/bin/env node
/**
 * P1.4 — evidencia BD: cierre bandeja + follow_up_date.
 * Uso: npx tsx --env-file=.env.local scripts/verify-p14-inbox-lifecycle-db.ts
 */

import postgres from "postgres";
import { createRequire } from "node:module";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const require = createRequire(import.meta.url);
try {
  const p = require.resolve("server-only");
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} };
} catch {
  /* ignore */
}

async function main() {
  const url =
    process.env.DATABASE_URL1?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    loadRailwayTestDatabaseUrl();

  if (!url) {
    console.error("No hay DATABASE_URL.");
    process.exit(1);
  }

  const { applyInboxLifecycleAfterSave, getConversationInboxState, getGestionFollowUpDate } =
    await import("../src/services/inbox-lifecycle.service.ts");
  const { buildFallbackTipificationCatalog } = await import("../src/lib/tipification-utils.ts");

  const catalog = buildFallbackTipificationCatalog();
  const sql = postgres(url, { ssl: url.includes("localhost") ? false : "require", prepare: false });

  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error("FAIL:", message);
      process.exitCode = 1;
    } else {
      console.log("OK:", message);
    }
  }

  async function ensureTestConversation(): Promise<string> {
    const id = `test-p14-${Date.now()}`;
    await sql`
      INSERT INTO lead_conversations (
        id, phone, customer_name, last_message, last_message_at, unread, status, online, inbox_state
      ) VALUES (
        ${id}, '56900000001', 'Test P1.4', 'test', now(), 0, 'new', false, 'active'
      )
    `;
    return id;
  }

  async function insertGestion(gestionId: string, conversationId: string, type: string) {
    await sql`
      INSERT INTO lead_gestiones (
        id, conversation_id, phone, customer_name, rut, gestion_type, notes, advisor_id, advisor_name, lines, created_at
      ) VALUES (
        ${gestionId}, ${conversationId}, '56900000001', 'Test P1.4', '11111111-1', ${type}, '', null, 'Test', '[]', now()
      )
    `;
  }

  async function cleanup(conversationId: string, gestionIds: string[]) {
    for (const gid of gestionIds) {
      await sql`DELETE FROM lead_gestiones WHERE id = ${gid}`;
    }
    await sql`DELETE FROM lead_conversations WHERE id = ${conversationId}`;
  }

  try {
    const convId = await ensureTestConversation();
    const gestionConsulta = `GEST-P14-consulta-${Date.now()}`;
    const gestionVentaOk = `GEST-P14-venta-ok-${Date.now()}`;
    const gestionVentaFail = `GEST-P14-venta-fail-${Date.now()}`;
    const gestionSeguimiento = `GEST-P14-seg-${Date.now()}`;

    await insertGestion(gestionConsulta, convId, "consulta");
    await insertGestion(gestionVentaOk, convId, "venta");
    await insertGestion(gestionVentaFail, convId, "venta");
    await insertGestion(gestionSeguimiento, convId, "seguimiento");

    console.log("\n--- Escenario 1: consulta + close ---");
    await sql`UPDATE lead_conversations SET inbox_state = 'active' WHERE id = ${convId}`;
    const r1 = await applyInboxLifecycleAfterSave({
      gestionId: gestionConsulta,
      conversationId: convId,
      slug: "consulta",
      saveAction: "close",
      saleRegistered: false,
      catalog,
    });
    const state1 = await getConversationInboxState(convId);
    assert(r1.inboxClosed && state1 === "closed", `consulta close → inbox_state=closed (got ${state1})`);

    console.log("\n--- Escenario 2: venta + sale OK ---");
    await sql`UPDATE lead_conversations SET inbox_state = 'active' WHERE id = ${convId}`;
    const r2 = await applyInboxLifecycleAfterSave({
      gestionId: gestionVentaOk,
      conversationId: convId,
      slug: "venta",
      saveAction: "sale",
      saleRegistered: true,
      catalog,
    });
    const state2 = await getConversationInboxState(convId);
    assert(r2.inboxClosed && state2 === "closed", `venta sale OK → inbox_state=closed (got ${state2})`);

    console.log("\n--- Escenario 3: venta + sale FAIL ---");
    await sql`UPDATE lead_conversations SET inbox_state = 'active' WHERE id = ${convId}`;
    const r3 = await applyInboxLifecycleAfterSave({
      gestionId: gestionVentaFail,
      conversationId: convId,
      slug: "venta",
      saveAction: "sale",
      saleRegistered: false,
      catalog,
    });
    const state3 = await getConversationInboxState(convId);
    assert(!r3.inboxClosed && state3 === "active", `venta sale FAIL → inbox_state=active (got ${state3})`);

    console.log("\n--- Escenario 4: venta + solo script (sin venta) ---");
    await sql`UPDATE lead_conversations SET inbox_state = 'active' WHERE id = ${convId}`;
    const r4 = await applyInboxLifecycleAfterSave({
      gestionId: gestionVentaOk,
      conversationId: convId,
      slug: "venta",
      saveAction: "script",
      saleRegistered: false,
      catalog,
    });
    const state4 = await getConversationInboxState(convId);
    assert(!r4.inboxClosed && state4 === "active", `venta script only → inbox_state=active (got ${state4})`);

    console.log("\n--- Escenario 5: seguimiento + follow_up_date ---");
    const followUpDate = "2026-08-20";
    const r5 = await applyInboxLifecycleAfterSave({
      gestionId: gestionSeguimiento,
      conversationId: convId,
      slug: "seguimiento",
      saveAction: "close",
      followUpDate,
      saleRegistered: false,
      catalog,
    });
    const persisted = await getGestionFollowUpDate(gestionSeguimiento);
    assert(
      r5.followUpDate === followUpDate && persisted === followUpDate,
      `seguimiento persiste follow_up_date=${persisted}`,
    );

    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'lead_gestiones' AND column_name = 'follow_up_date'
    `;
    assert(cols.length === 1, "columna lead_gestiones.follow_up_date existe");

    await cleanup(convId, [gestionConsulta, gestionVentaOk, gestionVentaFail, gestionSeguimiento]);

    if (process.exitCode) {
      console.error("\nVerificación BD P1.4 falló.");
      process.exit(1);
    }

    console.log("\nOK: P1.4 BD verificada (incl. venta condicional).");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
