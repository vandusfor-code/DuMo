#!/usr/bin/env node
/**
 * Backfill sales sin plan desde gestiones venta (phone + customer_name).
 * Uso: node --env-file=.env.local scripts/backfill-sales-plans-from-gestiones.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env.local"]) {
  const file = path.join(root, name);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (process.env[k]) continue;
    process.env[k] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const DATABASE_URL = process.env.DATABASE_URL1 ?? process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL1 requerido");

function parseLines(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

try {
  const configRows = await sql`SELECT value FROM app_config WHERE key = 'commercial_plans'`;
  const rawPlans = configRows[0]?.value;
  const plans = typeof rawPlans === "string" ? JSON.parse(rawPlans) : Array.isArray(rawPlans) ? rawPlans : [];
  const planById = new Map(plans.filter((p) => p.status === "active").map((p) => [p.id, p]));

  const emptySales = await sql`
    SELECT id, customer_name, phone, plan, operator_value, dumo_value
    FROM sales
    WHERE plan = '' OR plan IS NULL OR (operator_value = 0 AND dumo_value = 0)
  `;

  console.log(`Ventas a revisar: ${emptySales.length}`);
  let updated = 0;

  for (const sale of emptySales) {
    const [gestion] = await sql`
      SELECT lines FROM lead_gestiones
      WHERE gestion_type = 'venta'
        AND customer_name = ${sale.customer_name}
        AND phone = ${sale.phone}
      ORDER BY created_at DESC LIMIT 1
    `;
    if (!gestion) continue;
    const lines = parseLines(gestion.lines);
    const planId = lines.find((l) => l?.planId?.trim())?.planId?.trim();
    if (!planId) continue;
    const plan = planById.get(planId);
    if (!plan) continue;

    await sql`
      UPDATE sales SET
        plan = ${plan.name},
        operator_value = ${Number(plan.womValue ?? plan.operatorPayment ?? 0)},
        dumo_value = ${Number(plan.dumoValue ?? 0)}
      WHERE id = ${sale.id}
    `;
    await sql`
      UPDATE sale_lines SET plan_id = ${planId}
      WHERE sale_id = ${sale.id} AND (plan_id = '' OR plan_id IS NULL)
    `;
    console.log(`  ${sale.id} → plan=${plan.name} dumo=${plan.dumoValue}`);
    updated++;
  }

  console.log(`Backfill OK: ${updated}/${emptySales.length} ventas actualizadas.`);
} finally {
  await sql.end({ timeout: 5 });
}
