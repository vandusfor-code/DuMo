/**
 * Auditoría del camino builder → steps que consume la UI.
 * npx tsx scripts/audit-ui-path.ts
 */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { buildSalesScript } from "../src/lib/sales-script/builder";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const gestion: SaveLeadInput = {
  conversationId: "audit-test",
  phone: "56912345678",
  customerName: "Dulabs Test",
  rut: "12.345.678-9",
  type: "venta",
  notes: "",
  lines: [
    {
      phone: "56912345678",
      saleType: "portability",
      planId: "plan-o",
      equipment: "",
      equipmentMode: "none",
      currentOperator: "movistar",
      deliveryType: "home",
      email: "t@test.cl",
      deliveryAddress: "Av 1",
      region: "metropolitana",
      comuna: "Providencia",
      equipmentCatalogId: "",
      equipmentModel: "",
      equipmentValue: "",
      equipmentDownPayment: "",
      equipmentInstallments: "",
      equipmentInstallmentValue: "",
      equipmentCommercialText: "",
      accountType: "postpaid",
    },
  ],
};

const plans = COMMERCIAL_PLANS_MOCK.filter((p) => ["plan-w", "plan-o", "plan-m"].includes(p.id));

const ctx = buildScriptContext({
  gestion,
  commercialPlans: plans,
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
});

if (!ctx) {
  console.error("FAIL: context null");
  process.exit(1);
}

const blocks = buildTeleprompterBlocks(ctx);
const script = buildSalesScript({
  gestionId: "G-audit",
  gestion,
  commercialPlans: plans,
  advisor: { name: "María Asesora", email: "maria@wom.cl" },
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
});

console.log("=== BUILDER PATH ===");
console.log("stepCount", blocks.length);
console.log("stepIds", blocks.map((b) => b.id).join(" → "));

const b4 = blocks.find((b) => b.id === "bloque-4")?.content ?? "";
console.log("\n=== BLOQUE 4 ===");
console.log("genericFallback", b4.includes("a continuación te detallo"));
console.log("fromOffer", b4.includes("red 5G") && b4.includes("que acabas de contratar"));
console.log("lineDetailsPlan", ctx.lineDetails[0]?.plan?.id ?? "NULL");
console.log("preview", b4.slice(0, 280));

const b8 = blocks.find((b) => b.id === "bloque-8");
console.log("\n=== BLOQUE 8 ===");
console.log("phase1Only", b8?.content);
console.log("hasNpsBranch", Boolean(b8?.branch?.npsSurvey));
console.log("npsLeakedInPhase1", (b8?.content ?? "").includes("Que bueno que te gusto"));

const b12 = blocks.find((b) => b.id === "bloque-12");
console.log("\n=== BLOQUE 12 ===");
console.log("exists", Boolean(b12));
console.log("preview", b12?.content?.slice(0, 120));

console.log("\n=== ASSEMBLED SCRIPT (what gets persisted) ===");
console.log("scriptStepCount", script?.steps.length ?? 0);
console.log("scriptStepIds", script?.steps.map((s) => s.id).join(" → ") ?? "null");

// Simulate OLD persisted 9-block script
const oldScript = {
  ...script!,
  steps: script!.steps.slice(0, 9),
};
console.log("\n=== STALE SCRIPT SIMULATION (9 blocks) ===");
console.log("wouldShowBlock12", oldScript.steps.some((s) => s.id === "bloque-12"));
console.log("lastBlockId", oldScript.steps[oldScript.steps.length - 1]?.id);

// Plan mismatch simulation — debe rechazarse en validación, no generar fallback genérico
const ctxBadPlan = buildScriptContext({
  gestion: { ...gestion, lines: [{ ...gestion.lines[0], planId: "plan-unknown" }] },
  commercialPlans: plans,
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
});
console.log("\n=== BLOQUE 4 PLAN MISMATCH ===");
console.log("contextRejected", ctxBadPlan === null);
