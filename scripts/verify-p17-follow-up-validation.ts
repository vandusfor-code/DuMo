/**
 * P1.7 — Validación final fecha manual (cliente + servidor).
 * Uso: npx tsx --env-file=.env.local scripts/verify-p17-follow-up-validation.ts
 */

import postgres from "postgres";
import { validateLeadFormBeforeSave } from "../src/lib/lead-form-validation";
import {
  computeDefaultFollowUpDate,
  resolveFollowUpDateForSave,
  validateFollowUpDateForCloseAction,
  type TipificationBehaviorCatalogItem,
} from "../src/lib/tipification-follow-up";
import { draftToFormValues } from "../src/lib/lead-save";
import type { LeadFormValues } from "../src/types/lead-form";

const MANUAL_SLUGS = [
  "permanencia",
  "sin_cupo",
  "cliente_indica_fecha",
  "seguimiento",
  "pendiente",
  "reagenda",
] as const;

const SUGGESTED_SLUGS = ["deuda", "deuda_wom", "deuda_compania_donante"] as const;

const BASE = (process.env.LOCAL_API_URL ?? "http://localhost:3003").replace(/\/$/, "");
const DATABASE_URL = process.env.DATABASE_URL1?.trim() ?? process.env.DATABASE_URL?.trim();

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("OK:", message);
  }
}

function toCatalog(rows: Record<string, unknown>[]): TipificationBehaviorCatalogItem[] {
  return rows.map((r) => ({
    slug: String(r.slug),
    closesInbox: Boolean(r.closes_inbox),
    createsFollowUp: Boolean(r.creates_follow_up),
    followUpMode: r.follow_up_mode as TipificationBehaviorCatalogItem["followUpMode"],
    followUpDefaultDays:
      r.follow_up_default_days == null ? null : Number(r.follow_up_default_days),
    triggersSaleFlow: Boolean(r.triggers_sale_flow),
  }));
}

function baseFormValues(type: string, followUpDate = ""): LeadFormValues {
  const draft = draftToFormValues({
    conversation: { customerName: "Test", rut: "1-9", phone: "+56900000000" },
  });
  return { ...draft, type, followUpDate, observations: "P1.7 verify" };
}

async function loadCatalog(sql: postgres.Sql): Promise<TipificationBehaviorCatalogItem[]> {
  const rows = await sql`
    SELECT slug, closes_inbox, creates_follow_up, follow_up_mode, follow_up_default_days, triggers_sale_flow
    FROM tipifications
    WHERE company_id = 'company-default' AND status = 'active'
  `;
  return toCatalog(rows as Record<string, unknown>[]);
}

async function loginAdvisor(): Promise<{ cookie: string; userId: string }> {
  const login = process.env.P17_ADVISOR_LOGIN ?? "Carolina.wom";
  const password = process.env.P17_ADVISOR_PASSWORD ?? "P15TestLocal!2026";
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ login, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login falló (${res.status}): ${data.error ?? "unknown"}`);
  const raw = res.headers.get("set-cookie") ?? "";
  const cookie = raw.split(";")[0];
  if (!cookie) throw new Error("Login sin cookie");
  return { cookie, userId: data.user?.id ?? "" };
}

async function main() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL requerido");
  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

  try {
    const catalog = await loadCatalog(sql);
    console.log("=== P1.7 — Catálogo BD:", catalog.length, "tipificaciones ===\n");

    console.log("--- Manual: bloqueo servidor (validateFollowUpDateForCloseAction) ---");
    for (const slug of MANUAL_SLUGS) {
      const err = validateFollowUpDateForCloseAction({
        slug,
        catalog,
        followUpDate: "",
        saveAction: "close",
      });
      assert(err !== null, `${slug} — servidor bloquea fecha vacía`);
    }

    console.log("\n--- Manual: bloqueo cliente (validateLeadFormBeforeSave) ---");
    for (const slug of MANUAL_SLUGS) {
      const result = validateLeadFormBeforeSave({
        values: baseFormValues(slug, ""),
        saveAction: "close",
        catalog,
        triggersSaleFlow: () => false,
        isCompleteSaleLine: () => false,
      });
      assert(!result.ok && result.field === "followUpDate", `${slug} — cliente bloquea fecha vacía`);
    }

    console.log("\n--- Manual: permite con fecha válida ---");
    const validDate = "2026-09-15";
    for (const slug of ["permanencia", "seguimiento"] as const) {
      const serverOk =
        validateFollowUpDateForCloseAction({
          slug,
          catalog,
          followUpDate: validDate,
          saveAction: "close",
        }) === null;
      const clientOk = validateLeadFormBeforeSave({
        values: baseFormValues(slug, validDate),
        saveAction: "close",
        catalog,
        triggersSaleFlow: () => false,
        isCompleteSaleLine: () => false,
      }).ok;
      assert(serverOk && clientOk, `${slug} — acepta fecha ${validDate}`);
    }

    console.log("\n--- manual_suggested: pre-llenada (+7) sin tocar ---");
    const prefilled = computeDefaultFollowUpDate(7, new Date("2026-08-10T12:00:00"));
    for (const slug of SUGGESTED_SLUGS) {
      const resolved = resolveFollowUpDateForSave({
        slug,
        catalog,
        followUpDate: prefilled,
        now: new Date("2026-08-10T12:00:00"),
      });
      const client = validateLeadFormBeforeSave({
        values: baseFormValues(slug, prefilled),
        saveAction: "close",
        catalog,
        triggersSaleFlow: () => false,
        isCompleteSaleLine: () => false,
      });
      assert(
        resolved.error === null && resolved.followUpDate === prefilled && client.ok,
        `${slug} — pre-llenada ${prefilled} OK cliente+servidor`,
      );
    }

    console.log("\n--- manual_suggested: bloqueo si borran el campo ---");
    for (const slug of SUGGESTED_SLUGS) {
      const serverErr = validateFollowUpDateForCloseAction({
        slug,
        catalog,
        followUpDate: "",
        saveAction: "close",
      });
      const client = validateLeadFormBeforeSave({
        values: baseFormValues(slug, ""),
        saveAction: "close",
        catalog,
        triggersSaleFlow: () => false,
        isCompleteSaleLine: () => false,
      });
      assert(serverErr !== null, `${slug} — servidor bloquea campo vaciado`);
      assert(!client.ok, `${slug} — cliente bloquea campo vaciado`);
    }

    console.log("\n--- saveAction script no exige fecha (regresión P1.3) ---");
    const scriptSkip = validateFollowUpDateForCloseAction({
      slug: "permanencia",
      catalog,
      followUpDate: "",
      saveAction: "script",
    });
    assert(scriptSkip === null, "permanencia + script no exige fecha");

    console.log("\n=== API POST /api/leads (servidor real) ===\n");

    let cookie: string;
    try {
      ({ cookie } = await loginAdvisor());
      console.log("Login asesora OK");
    } catch (err) {
      console.log("Login API omitido —", (err as Error).message);
      console.log("(Configura P17_ADVISOR_PASSWORD o reset temporal local)");
      if (!process.exitCode) {
        console.log("\nOK parcial — lógica cliente/servidor verificada sin API live.");
      }
      return;
    }

    const conv = await sql`
      SELECT c.id, c.customer_name, c.phone
      FROM lead_conversations c
      JOIN users u ON u.id = c.assigned_advisor_id
      WHERE u.username = 'Carolina.wom' AND c.inbox_state = 'active'
      ORDER BY c.last_message_at DESC
      LIMIT 1
    `;
    if (!conv[0]) throw new Error("Sin conversación activa para Carolina");
    const conversationId = conv[0].id as string;

    const basePayload = {
      conversationId,
      phone: conv[0].phone ?? "+56900000000",
      customerName: conv[0].customer_name ?? "Test",
      rut: "11111111-1",
      notes: "P1.7 API verify",
      lines: [],
      registerSale: false,
      saveAction: "close" as const,
    };

    const emptyPermRes = await fetch(`${BASE}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ ...basePayload, type: "permanencia", followUpDate: "" }),
    });
    const emptyPermBody = await emptyPermRes.json();
    assert(
      emptyPermRes.status === 422 && emptyPermBody.error,
      `API permanencia sin fecha → 422 (${emptyPermRes.status})`,
    );

    const clearedRes = await fetch(`${BASE}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ ...basePayload, type: "deuda", followUpDate: "" }),
    });
    const clearedBody = await clearedRes.json();
    assert(
      clearedRes.status === 422 && clearedBody.error,
      `API deuda vaciada → 422 (${clearedRes.status})`,
    );

    const conv2 = await sql`
      SELECT c.id, c.customer_name, c.phone
      FROM lead_conversations c
      JOIN users u ON u.id = c.assigned_advisor_id
      WHERE u.username = 'Carolina.wom' AND c.inbox_state = 'active' AND c.id <> ${conversationId}
      ORDER BY c.last_message_at DESC
      LIMIT 1
    `;
    const conv2Id = conv2[0]?.id as string | undefined;
    if (conv2Id) {
      const suggestedRes = await fetch(`${BASE}/api/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({
          ...basePayload,
          conversationId: conv2Id,
          phone: conv2[0].phone ?? basePayload.phone,
          customerName: conv2[0].customer_name ?? basePayload.customerName,
          type: "deuda",
          followUpDate: prefilled,
        }),
      });
      assert(suggestedRes.status === 201, `API deuda pre-llenada → 201 (${suggestedRes.status})`);
    } else {
      console.log("SKIP: API deuda pre-llenada — sin segunda conversación activa");
    }

    if (process.exitCode) {
      console.error("\nVerificación P1.7 falló.");
      process.exit(1);
    }
    console.log("\nOK — P1.7 validación fecha manual (cliente + servidor + API).");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
