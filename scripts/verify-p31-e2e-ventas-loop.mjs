#!/usr/bin/env node
/**
 * P3.1 E2E — plan/valores → finalizar → dashboard + contabilidad + comisiones
 * Uso: node --env-file=.env.local scripts/verify-p31-e2e-ventas-loop.mjs --base=https://du-mo.vercel.app
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
  "https://du-mo.vercel.app"
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

async function apiGet(path, cookie) {
  const res = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json", Cookie: cookie },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function apiPost(path, cookie, body) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Cookie: cookie },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function apiPatch(path, cookie, body) {
  const res = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json", Cookie: cookie },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
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
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const monthKey = `${year}-${month}`;

  try {
    console.log("=== P3.1 E2E — Ventas ↔ Metas ↔ Contabilidad ===");
    console.log("Base:", base);

    const plansRow = await sql`SELECT value FROM app_config WHERE key = 'commercial_plans'`;
    const plans = JSON.parse(plansRow[0]?.value ?? "[]");
    const plan = plans.find((p) => p.id === "plan-003" && p.status === "active") ?? plans[0];
    if (!plan) throw new Error("Sin planes en config comercial");
    const expectedDumo = Number(plan.dumoValue ?? 0);
    const expectedCommission = Number(plan.advisorCommission ?? 0);
    console.log(`Plan prueba: ${plan.id} ${plan.name} dumo=${expectedDumo} comisión=${expectedCommission}`);

    const [carolina] = await sql`SELECT id, username FROM users WHERE username ILIKE 'Carolina.wom' LIMIT 1`;
    const [conv] = await sql`
      SELECT id, customer_name, phone FROM lead_conversations
      WHERE assigned_advisor_id = ${carolina.id} AND inbox_state = 'active'
      ORDER BY last_message_at DESC LIMIT 1
    `;
    if (!conv) throw new Error("Sin conversación activa para Carolina");

    const carolinaSession = await login("Carolina.wom", process.env.P21_CAROLINA_PASSWORD ?? "Carolina2026!");
    const adminSession = await login(process.env.PROD_ADMIN_LOGIN ?? "duvan.ramos", process.env.PROD_ADMIN_PASSWORD ?? "100299");

    const payload = {
      conversationId: conv.id,
      phone: conv.phone,
      customerName: conv.customer_name || "P3.1 E2E",
      rut: "12.345.678-9",
      type: "venta",
      notes: "P3.1 E2E verify",
      saveAction: "script",
      registerSale: false,
      lines: [
        {
          phone: conv.phone || "56987654321",
          saleType: "portability",
          planId: plan.id,
          equipment: "",
          equipmentMode: "none",
          currentOperator: "wom",
          deliveryType: "home",
          email: "p31@example.com",
          deliveryAddress: "Test 123",
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

    console.log("\n--- 1) Crear venta (saveAction=script) ---");
    const create = await apiPost("/api/leads", carolinaSession.cookie, payload);
    const saleId = create.body?.sale?.id;
    console.log("  HTTP:", create.status, "saleId:", saleId ?? "NONE");
    if (!saleId) failures.push("no sale id");

    const [saleRow] = saleId
      ? await sql`SELECT plan, operator_value, dumo_value, status FROM sales WHERE id = ${saleId}`
      : [null];
    const [lineRow] = saleId
      ? await sql`SELECT plan_id FROM sale_lines WHERE sale_id = ${saleId} LIMIT 1`
      : [null];

    console.log("  BD sales:", saleRow);
    console.log("  BD plan_id:", lineRow?.plan_id);
    if (!saleRow?.plan) failures.push("plan vacío en BD");
    if (Number(saleRow?.dumo_value ?? 0) <= 0) failures.push("dumo_value=0");
    if (lineRow?.plan_id !== plan.id) failures.push("plan_id incorrecto");
    if (Number(saleRow?.dumo_value) !== expectedDumo) {
      failures.push(`dumo esperado ${expectedDumo} got ${saleRow?.dumo_value}`);
    }

    console.log("\n--- 2) Finalizar venta (admin) ---");
    if (saleId) {
      const fin = await apiPatch("/api/admin/sales", adminSession.cookie, {
        action: "setStatus",
        ids: [saleId],
        status: "finalizada",
      });
      console.log("  PATCH setStatus finalizada:", fin.status);
      if (fin.status !== 200) failures.push(`finalize ${fin.status}`);
    }

    console.log("\n--- 3) Dashboard admin ---");
    const dash = await apiGet("/api/admin/dashboard", adminSession.cookie);
    const econCurrent = dash.body?.economicGoal?.current ?? 0;
    const salesMonth = dash.body?.monthlyGoal?.current ?? dash.body?.kpis?.salesMonth;
    console.log("  economicGoal.current:", econCurrent);
    console.log("  monthlyGoal.current:", salesMonth);
    if (dash.status !== 200) failures.push("dashboard status");
    if (econCurrent <= 0) failures.push("economicGoal.current=0");

    console.log("\n--- 4) Contabilidad ---");
    const acct = await apiGet(`/api/admin/accounting?year=${year}&month=${month}`, adminSession.cookie);
    const income = acct.body?.summary?.currentIncome ?? 0;
    const chartLast = acct.body?.chart?.at?.(-1);
    console.log("  summary.currentIncome:", income);
    console.log("  chart último mes:", chartLast);
    if (income <= 0) failures.push("contabilidad income=0");
    if (!chartLast || chartLast.income <= 0) failures.push("chart income=0");

    console.log("\n--- 5) Comisiones ---");
    const comm = await apiGet(`/api/admin/commissions?year=${year}&month=${month}`, adminSession.cookie);
    const advisors = comm.body?.advisors ?? comm.body?.rows ?? [];
    const carolinaComm = advisors.find((a) =>
      String(a.name ?? a.advisorName ?? "").toLowerCase().includes("carolina"),
    );
    console.log("  Carolina commission row:", carolinaComm ? {
      generated: carolinaComm.generated ?? carolinaComm.commissionGenerated,
      sales: carolinaComm.sales ?? carolinaComm.salesCount,
    } : "no encontrada");
    if (comm.status !== 200) failures.push("commissions status");
    if (carolinaComm && expectedCommission > 0) {
      const gen = Number(carolinaComm.generated ?? carolinaComm.commissionGenerated ?? 0);
      if (gen > 0 && gen < expectedCommission) {
        failures.push(`comisión ${gen} < esperada ${expectedCommission} (¿baseCommission?)`);
      }
    }

    console.log("\n--- 6) Admin ventas list ---");
    const salesList = await apiGet("/api/admin/sales?page=1&pageSize=5", adminSession.cookie);
    const row = (salesList.body?.rows ?? []).find((r) => r.id === saleId);
    console.log("  fila venta:", row ? { plan: row.plan, dumoValue: row.dumoValue, status: row.status } : "no");
    if (row && row.dumoValue <= 0) failures.push("admin sales dumoValue=0");

    console.log("\n--- 7) Stats BD mes ---");
    const finalized = await sql`
      SELECT count(*)::int AS n, coalesce(sum(dumo_value),0)::numeric AS dumo_sum
      FROM sales WHERE status = 'finalizada'
        AND to_char(sale_date, 'YYYY-MM') = ${monthKey}
    `;
    console.log("  finalizadas mes:", finalized[0]);

    if (failures.length) {
      console.error("\nFALLOS P3.1 E2E:", failures.join("; "));
      process.exit(1);
    }
    console.log("\nOK — loop completo P3.1 verificado.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
