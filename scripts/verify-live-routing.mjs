#!/usr/bin/env node
/**
 * Verifica etapa 3: enrutamiento por presence_status (Railway).
 * Uso:
 *   node --env-file=.env.railway.postgres.local scripts/verify-live-routing.mjs
 */

import postgres from "postgres";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const ONLINE_MINS = 10;

const url =
  process.env.DATABASE_URL1?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  loadRailwayTestDatabaseUrl();

if (!url) {
  console.error("No hay DATABASE_URL en el entorno.");
  process.exit(1);
}

const sql = postgres(url, { ssl: url.includes("localhost") ? false : "require", prepare: false });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function assignRoundRobin(conversationId, onlyOnline) {
  const rows = await sql`
    WITH advisors AS (
      SELECT id, name,
             (row_number() OVER (ORDER BY last_seen_at DESC NULLS LAST, name)) - 1 AS rn,
             (count(*) OVER ()) AS total
      FROM users
      WHERE role = 'asesora' AND active = true
        AND presence_status = 'disponible'
        AND (
          ${onlyOnline}::boolean IS FALSE
          OR (
            last_seen_at IS NOT NULL
            AND last_seen_at > now() - make_interval(mins => ${ONLINE_MINS})
          )
        )
    ),
    pending AS (
      SELECT id, (row_number() OVER (ORDER BY last_message_at)) - 1 AS rn
      FROM lead_conversations
      WHERE assigned_advisor_id IS NULL
        AND (${conversationId}::text IS NULL OR id = ${conversationId}::text)
      LIMIT 200
    )
    UPDATE lead_conversations c
    SET assigned_advisor_id = a.id,
        assigned_advisor_name = a.name,
        admin_status = 'asignado'
    FROM pending p, advisors a
    WHERE c.id = p.id
      AND c.assigned_advisor_id IS NULL
      AND a.total > 0
      AND a.rn = (p.rn % a.total)
    RETURNING c.id, c.assigned_advisor_id, c.assigned_advisor_name
  `;
  return rows;
}

async function autoAssignWithFallback(conversationId) {
  const online = await assignRoundRobin(conversationId, true);
  if (online.length > 0) return online;

  const [counts] = await sql`
    SELECT
      count(*) FILTER (
        WHERE last_seen_at IS NOT NULL
          AND last_seen_at > now() - make_interval(mins => ${ONLINE_MINS})
      )::int AS online_any,
      count(*) FILTER (
        WHERE presence_status = 'disponible'
          AND last_seen_at IS NOT NULL
          AND last_seen_at > now() - make_interval(mins => ${ONLINE_MINS})
      )::int AS online_disponible
    FROM users
    WHERE role = 'asesora' AND active = true
  `;

  if (counts.online_any > 0 && counts.online_disponible === 0) {
    return [];
  }

  return assignRoundRobin(conversationId, false);
}

async function setAdvisorState(id, { presence, online }) {
  if (online) {
    await sql`
      UPDATE users
      SET presence_status = ${presence},
          last_seen_at = now(),
          presence_updated_at = now(),
          presence_updated_by = 'verify-live-routing'
      WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE users
      SET presence_status = ${presence},
          last_seen_at = NULL,
          presence_updated_at = now(),
          presence_updated_by = 'verify-live-routing'
      WHERE id = ${id}
    `;
  }
}

async function createPendingConversation(id) {
  await sql`
    INSERT INTO lead_conversations (
      id, phone, customer_name, last_message, last_message_at, unread, online, admin_status
    )
    VALUES (
      ${id},
      '+56900009999',
      'Test Live Routing',
      'hola test',
      now(),
      1,
      false,
      'nuevo'
    )
    ON CONFLICT (id) DO UPDATE SET
      assigned_advisor_id = NULL,
      assigned_advisor_name = NULL,
      admin_status = 'nuevo'
  `;
}

async function getAssignment(conversationId) {
  const [row] = await sql`
    SELECT assigned_advisor_id, assigned_advisor_name
    FROM lead_conversations
    WHERE id = ${conversationId}
  `;
  return row;
}

async function manualAssignAllowed(advisorId) {
  const [row] = await sql`
    SELECT presence_status FROM users WHERE id = ${advisorId}
  `;
  return row?.presence_status === "disponible";
}

const TEST_CONV_ID = `verify-live-routing-${Date.now()}`;
let backup = [];

try {
  const advisors = await sql`
    SELECT id, name FROM users
    WHERE role = 'asesora' AND active = true
    ORDER BY name
    LIMIT 3
  `;

  assert(advisors.length >= 2, "Se necesitan al menos 2 asesoras activas en Railway.");

  backup = [];

  const allAdvisors = await sql`
    SELECT id, name, presence_status, last_seen_at
    FROM users
    WHERE role = 'asesora' AND active = true
  `;
  for (const row of allAdvisors) {
    backup.push({
      id: row.id,
      presence: row.presence_status,
      last_seen_at: row.last_seen_at,
    });
  }

  const [a, b] = advisors;

  console.log(`Asesoras de prueba: ${a.name}, ${b.name}`);
  console.log(`Conversación de prueba: ${TEST_CONV_ID}\n`);

async function isolateOtherAdvisors(keepIds) {
  const keep = new Set(keepIds);
  const all = await sql`SELECT id FROM users WHERE role = 'asesora' AND active = true`;
  for (const adv of all) {
    if (keep.has(adv.id)) continue;
    await setAdvisorState(adv.id, { presence: "bano", online: false });
  }
}

  // --- Escenario 1: una disponible online + otra en baño ---
  console.log("Escenario 1: disponible + baño (ambas online)…");
  await isolateOtherAdvisors([a.id, b.id]);
  await setAdvisorState(a.id, { presence: "disponible", online: true });
  await setAdvisorState(b.id, { presence: "bano", online: true });
  await createPendingConversation(TEST_CONV_ID);

  const s1 = await autoAssignWithFallback(TEST_CONV_ID);
  const s1Row = await getAssignment(TEST_CONV_ID);
  assert(s1.length === 1, "debe asignarse exactamente 1 conversación");
  assert(s1Row.assigned_advisor_id === a.id, `debe asignarse a ${a.name} (disponible), no a ${b.name}`);
  console.log(`   OK → asignado a ${s1Row.assigned_advisor_name} (${s1Row.assigned_advisor_id})`);

  // --- Escenario 2: todas conectadas en baño/almuerzo ---
  console.log("\nEscenario 2: todas conectadas en baño/almuerzo…");
  await isolateOtherAdvisors([a.id, b.id]);
  await sql`
    UPDATE lead_conversations
    SET assigned_advisor_id = NULL, assigned_advisor_name = NULL, admin_status = 'nuevo'
    WHERE id = ${TEST_CONV_ID}
  `;
  await setAdvisorState(a.id, { presence: "bano", online: true });
  await setAdvisorState(b.id, { presence: "almuerzo", online: true });

  const s2 = await autoAssignWithFallback(TEST_CONV_ID);
  const s2Row = await getAssignment(TEST_CONV_ID);
  assert(s2.length === 0, "no debe auto-asignarse");
  assert(s2Row.assigned_advisor_id === null, "lead debe quedar pendiente (sin asesora)");
  console.log("   OK → lead pendiente (assigned_advisor_id = NULL)");

  // --- Escenario 3: asignación manual ---
  console.log("\nEscenario 3: asignación manual…");
  const manualToBano = await manualAssignAllowed(b.id);
  assert(manualToBano === false, "manual a asesora en almuerzo debe bloquearse");
  console.log(`   OK → bloqueo manual a ${b.name} (almuerzo)`);

  await setAdvisorState(a.id, { presence: "disponible", online: true });
  const manualToDisponible = await manualAssignAllowed(a.id);
  assert(manualToDisponible === true, "manual a disponible debe permitirse");
  await sql`
    UPDATE lead_conversations
    SET assigned_advisor_id = ${a.id},
        assigned_advisor_name = ${a.name},
        admin_status = 'asignado'
    WHERE id = ${TEST_CONV_ID}
  `;
  const s3Row = await getAssignment(TEST_CONV_ID);
  assert(s3Row.assigned_advisor_id === a.id, "manual a disponible debe asignar");
  console.log(`   OK → manual permitido a ${a.name} (disponible)`);

  // --- Escenario extra: nadie online, una disponible offline → fallback ---
  console.log("\nEscenario extra: fallback offline (disponible sin last_seen)…");
  await isolateOtherAdvisors([a.id, b.id]);
  await sql`
    UPDATE lead_conversations
    SET assigned_advisor_id = NULL, assigned_advisor_name = NULL, admin_status = 'nuevo'
    WHERE id = ${TEST_CONV_ID}
  `;
  await setAdvisorState(a.id, { presence: "disponible", online: false });
  await setAdvisorState(b.id, { presence: "bano", online: false });

  const s4 = await autoAssignWithFallback(TEST_CONV_ID);
  const s4Row = await getAssignment(TEST_CONV_ID);
  assert(s4.length === 1, "fallback offline debe asignar a disponible");
  assert(s4Row.assigned_advisor_id === a.id, "fallback debe ir a la única disponible");
  console.log(`   OK → fallback offline asignó a ${s4Row.assigned_advisor_name}`);

  console.log("\nOK: etapa 3 (enrutamiento por presence_status) verificada.");
} catch (error) {
  console.error("\nFALLÓ:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  try {
    await sql`DELETE FROM lead_conversations WHERE id LIKE 'verify-live-routing-%'`;
    for (const row of backup ?? []) {
      await sql`
        UPDATE users
        SET presence_status = ${row.presence},
            last_seen_at = ${row.last_seen_at},
            presence_updated_by = NULL
        WHERE id = ${row.id}
      `;
    }
  } catch {
    /* best effort cleanup */
  }
  await sql.end({ timeout: 5 });
}
