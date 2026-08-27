#!/usr/bin/env node
/**
 * Elimina conversaciones/leads con teléfono colombiano (+57).
 * Uso:
 *   node --env-file=.env.local scripts/delete-colombia-leads.mjs --dry-run
 *   node --env-file=.env.local scripts/delete-colombia-leads.mjs --execute
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env.local", ".env.production.local"]) {
  const file = path.join(root, name);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim();
  }
}

const execute = process.argv.includes("--execute");
const dryRun = !execute;
const DATABASE_URL = process.env.DATABASE_URL1?.trim() ?? process.env.DATABASE_URL?.trim();
if (!DATABASE_URL) throw new Error("DATABASE_URL requerido");

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

/** Dígitos normalizados — alineado con src/lib/whatsapp/phone.ts */
function phoneDigits(raw) {
  if (!raw) return "";
  const user = String(raw).trim();
  const local = user.includes("@") ? (user.split("@")[0] ?? "") : user;
  const base = (local.split(":")[0] ?? local).replace(/\D/g, "");
  if (base.length === 14 && base.startsWith("57")) return base.slice(0, 12);
  return base;
}

function isColombiaDigits(d) {
  if (!d) return false;
  if (d.startsWith("57") && d.length >= 12) return true;
  if (d.length === 10 && d.startsWith("3")) return true;
  return false;
}

function isColombiaLead(row) {
  const fromPhone = phoneDigits(row.phone);
  const fromId = phoneDigits(row.id.includes(":") ? row.id.split(":").slice(1).join(":") : row.id);
  return isColombiaDigits(fromPhone) || isColombiaDigits(fromId);
}

async function main() {
  console.log(execute ? "=== ELIMINAR LEADS +57 (EJECUCIÓN) ===" : "=== DRY RUN — leads +57 ===");

  const all = await sql`
    SELECT id, phone, customer_name, inbox_state, assigned_advisor_name
    FROM lead_conversations
    ORDER BY last_message_at DESC
  `;

  const colombia = all.filter(isColombiaLead);
  const chileSample = all.filter((r) => {
    const d = phoneDigits(r.phone) || phoneDigits(r.id.split(":")[1] ?? "");
    return d.startsWith("56");
  });

  console.log(`Total conversaciones: ${all.length}`);
  console.log(`Colombia (+57): ${colombia.length}`);
  console.log(`Chile (+56) — NO se tocan: ${chileSample.length}`);
  console.log("\nMuestra Colombia (max 15):");
  for (const r of colombia.slice(0, 15)) {
    console.log(`  ${r.id} | ${r.phone} | ${r.customer_name || "(sin nombre)"} | ${r.inbox_state}`);
  }
  if (colombia.length > 15) console.log(`  ... y ${colombia.length - 15} más`);

  const ids = colombia.map((r) => r.id);
  if (ids.length === 0) {
    console.log("\nNada que borrar.");
    return;
  }

  const phones = [...new Set(colombia.map((r) => phoneDigits(r.phone)).filter(Boolean))];

  const [msgs, notes, gestiones, followUps, crm, salesByPhone] = await Promise.all([
    sql`SELECT count(*)::int AS n FROM lead_messages WHERE conversation_id = ANY(${ids})`,
    sql`SELECT count(*)::int AS n FROM lead_notes WHERE conversation_id = ANY(${ids})`,
    sql`SELECT count(*)::int AS n FROM lead_gestiones WHERE conversation_id = ANY(${ids})`,
    sql`SELECT count(*)::int AS n FROM lead_follow_ups WHERE conversation_id = ANY(${ids})`,
    sql`SELECT count(*)::int AS n FROM crm_clients WHERE conversation_id = ANY(${ids})`,
    phones.length
      ? sql`
          SELECT count(*)::int AS n FROM sales
          WHERE regexp_replace(phone, '\\D', '', 'g') = ANY(${phones})
             OR regexp_replace(phone, '\\D', '', 'g') LIKE ANY(${phones.map((p) => `57${p.slice(-10)}`)})
        `
      : Promise.resolve([{ n: 0 }]),
  ]);

  console.log("\nRegistros relacionados a borrar:");
  console.log(JSON.stringify({
    conversations: ids.length,
    messages: msgs[0].n,
    notes: notes[0].n,
    gestiones: gestiones[0].n,
    followUps: followUps[0].n,
    crmClients: crm[0].n,
    salesByPhone: salesByPhone[0].n,
  }, null, 2));

  if (dryRun) {
    console.log("\nDry-run completo. Ejecuta con --execute para borrar.");
    return;
  }

  console.log("\nBorrando en transacción...");
  await sql.begin(async (tx) => {
    const fu = await tx`DELETE FROM lead_follow_ups WHERE conversation_id = ANY(${ids}) RETURNING id`;
    const ge = await tx`DELETE FROM lead_gestiones WHERE conversation_id = ANY(${ids}) RETURNING id`;
    const no = await tx`DELETE FROM lead_notes WHERE conversation_id = ANY(${ids}) RETURNING id`;
    const me = await tx`DELETE FROM lead_messages WHERE conversation_id = ANY(${ids}) RETURNING id`;
    const cr = await tx`DELETE FROM crm_clients WHERE conversation_id = ANY(${ids}) RETURNING id`;
    const co = await tx`DELETE FROM lead_conversations WHERE id = ANY(${ids}) RETURNING id`;

    let sa = [];
    if (phones.length) {
      const saleIds = await tx`
        SELECT id FROM sales
        WHERE regexp_replace(phone, '\\D', '', 'g') = ANY(${phones})
           OR regexp_replace(phone, '\\D', '', 'g') LIKE '57%'
      `;
      const saleIdList = saleIds.map((r) => r.id);
      if (saleIdList.length) {
        await tx`DELETE FROM sale_lines WHERE sale_id = ANY(${saleIdList})`;
        sa = await tx`DELETE FROM sales WHERE id = ANY(${saleIdList}) RETURNING id`;
      }
    }

    console.log("  follow_ups:", fu.length);
    console.log("  gestiones:", ge.length);
    console.log("  notes:", no.length);
    console.log("  messages:", me.length);
    console.log("  crm_clients:", cr.length);
    console.log("  conversations:", co.length);
    console.log("  sales:", sa.length);
  });

  const remaining = (await sql`SELECT count(*)::int AS n FROM lead_conversations`).map((r) => r.n)[0];
  const remainingCo = all.filter(isColombiaLead).length;
  console.log(`\nOK — conversaciones restantes en BD: ${remaining}`);
  console.log(`Colombia eliminados: ${ids.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sql.end({ timeout: 5 }));
