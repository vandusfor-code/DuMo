#!/usr/bin/env node
/**
 * P3.0 — Verifica registro de venta en saveAction=script + admin scope
 * Uso: node --env-file=.env.local scripts/verify-p30-sale-on-script.mjs --base=https://du-mo.vercel.app
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
for (const name of [".env.local", ".env.production.local"]) {
  const file = path.join(root, name);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (process.env[k]) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[k] = val;
  }
}

const base = (
  process.argv.find((a) => a.startsWith("--base="))?.slice("--base=".length) ??
  "http://localhost:3000"
).replace(/\/$/, "");

const DATABASE_URL = process.env.DATABASE_URL1?.trim() ?? process.env.DATABASE_URL?.trim();

function parseCookie(setCookie) {
  const m = (setCookie ?? "").match(/dumo_session=([^;]+)/);
  return m ? `dumo_session=${m[1]}` : null;
}

async function login(login, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ login, password }),
    signal: AbortSignal.timeout(45_000),
  });
  const data = await res.json().catch(() => ({}));
  const cookie = parseCookie(res.headers.get("set-cookie"));
  if (!res.ok || !cookie) throw new Error(`Login ${login} falló (${res.status})`);
  return { cookie, user: data.user };
}

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

async function main() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL1 requerido");
  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });
  const failures = [];

  try {
    console.log("=== P3.0 verify — venta en saveAction=script ===");
    console.log("Base:", base);

    const [carolina] = await sql`SELECT id, username FROM users WHERE username ILIKE 'Carolina.wom' LIMIT 1`;
    const [testConv] = await sql`
      SELECT id, customer_name, phone FROM lead_conversations
      WHERE assigned_advisor_id = ${carolina.id} AND inbox_state = 'active'
      ORDER BY last_message_at DESC LIMIT 1
    `;
    const [template] = await sql`
      SELECT lines FROM lead_gestiones WHERE gestion_type = 'venta' ORDER BY created_at DESC LIMIT 1
    `;
    const line0 = parseLines(template?.lines)[0] ?? {};

    const [salesBefore] = await sql`SELECT count(*)::int AS n FROM sales`;
    const session = await login("Carolina.wom", process.env.P21_CAROLINA_PASSWORD ?? "Carolina2026!");

    const payload = {
      conversationId: testConv.id,
      phone: testConv.phone || "56900000001",
      customerName: testConv.customer_name || "P3.0 verify",
      rut: "12.345.678-9",
      type: "venta",
      notes: "P3.0 verify script→sale",
      saveAction: "script",
      registerSale: false,
      lines: [
        {
          phone: line0.phone || "56987654321",
          saleType: line0.saleType || "portability",
          planId: line0.planId || "plan-003",
          equipment: "",
          equipmentMode: "none",
          currentOperator: "wom",
          deliveryType: "home",
          email: "p30@example.com",
          deliveryAddress: "Test",
          region: "Región Metropolitana",
          comuna: "Santiago",
          equipmentCatalogId: "",
          equipmentModel: "",
          equipmentValue: "",
          equipmentDownPayment: "",
          equipmentInstallments: "",
          equipmentInstallmentValue: "",
          equipmentCommercialText: "",
          accountType: "postpaid",
          isUpselling: false,
        },
      ],
    };

    const res = await fetch(`${base}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Cookie: session.cookie },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90_000),
    });
    const body = await res.json().catch(() => ({}));
    const [salesAfter] = await sql`SELECT count(*)::int AS n FROM sales`;

    console.log("  POST /api/leads saveAction=script →", res.status);
    console.log("  sale en resp:", body.sale ? body.sale.id ?? "SÍ" : "NO");
    console.log("  saleError:", body.saleError ?? "(ninguno)");
    console.log("  sales:", salesBefore.n, "→", salesAfter.n);

    if (res.status !== 201) failures.push(`HTTP ${res.status}`);
    if (!body.sale) failures.push("saveAction=script no devolvió sale");
    if (salesAfter.n <= salesBefore.n) failures.push("BD sales no incrementó");

    // Admin path
    const admin = await login(process.env.PROD_ADMIN_LOGIN ?? "duvan.ramos", process.env.PROD_ADMIN_PASSWORD ?? "100299");
    const [salesBeforeAdmin] = await sql`SELECT count(*)::int AS n FROM sales`;
    const adminRes = await fetch(`${base}/api/admin/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Cookie: admin.cookie },
      body: JSON.stringify({ ...payload, saveAction: "sale", registerSale: true, notes: "P3.0 admin verify" }),
      signal: AbortSignal.timeout(90_000),
    });
    const adminBody = await adminRes.json().catch(() => ({}));
    const [salesAfterAdmin] = await sql`SELECT count(*)::int AS n FROM sales`;

    console.log("");
    console.log("  POST /api/admin/leads saveAction=sale →", adminRes.status);
    console.log("  sale en resp:", adminBody.sale ? adminBody.sale.id ?? "SÍ" : "NO");
    console.log("  saleError:", adminBody.saleError ?? "(ninguno)");
    console.log("  sales:", salesBeforeAdmin.n, "→", salesAfterAdmin.n);

    if (adminRes.status !== 200) failures.push(`admin HTTP ${adminRes.status}`);
    if (!adminBody.sale) failures.push("admin saveAction=sale no devolvió sale");
    if (salesAfterAdmin.n <= salesBeforeAdmin.n) failures.push("admin no incrementó sales");

    if (failures.length) {
      console.error("\nFALLOS P3.0:", failures.join("; "));
      process.exit(1);
    }
    console.log("\nOK — P3.0 verificado.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
