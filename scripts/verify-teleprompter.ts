/**
 * Verificación de escenarios del teleprompter — ejecutar antes del commit:
 * npx tsx scripts/verify-teleprompter.ts
 */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildContractResumenSpeech } from "../src/lib/sales-script/contract-resumen";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { buildMultilineBenefitsSpeech } from "../src/lib/sales-script/teleprompter/speech-builders";
import { findUnresolvedPlaceholders } from "../src/lib/sales-script/teleprompter/speech-utils";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => ["plan-w", "plan-o", "plan-m"].includes(p.id));

const advisorPlans = PLANS.map((p) => ({
  id: p.id,
  name: p.name,
  womValue: p.womValue,
  dumoValue: p.dumoValue,
}));

function baseGestion(overrides: Partial<SaveLeadInput> & { lines: SaveLeadInput["lines"] }): SaveLeadInput {
  return {
    conversationId: "conv-test-001",
    phone: "56912345678",
    customerName: "Dulabs Test",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    ...overrides,
    lines: overrides.lines,
  };
}

function line(
  index: number,
  planId: string,
  opts?: { isUpselling?: boolean },
): SaveLeadInput["lines"][number] {
  return {
    phone: `5691234567${index}`,
    saleType: "portability",
    planId,
    equipment: "",
    equipmentMode: "none",
    currentOperator: "movistar",
    deliveryType: "home",
    email: "dulabs@test.cl",
    deliveryAddress: "Av. Test 123",
    region: "13",
    comuna: "Providencia",
    equipmentCatalogId: "",
    equipmentModel: "",
    equipmentValue: "",
    equipmentDownPayment: "",
    equipmentInstallments: "",
    equipmentInstallmentValue: "",
    equipmentCommercialText: "",
    accountType: "postpaid",
    isUpselling: opts?.isUpselling,
  };
}

const SCENARIOS: { name: string; gestion: SaveLeadInput }[] = [
  {
    name: "1 línea — Plan O",
    gestion: baseGestion({ lines: [line(0, "plan-o")] }),
  },
  {
    name: "2 líneas — mismo plan (Plan O)",
    gestion: baseGestion({ lines: [line(0, "plan-o"), line(1, "plan-o")] }),
  },
  {
    name: "3 líneas — mismo plan (Plan O)",
    gestion: baseGestion({ lines: [line(0, "plan-o"), line(1, "plan-o"), line(2, "plan-o")] }),
  },
  {
    name: "2 líneas — planes distintos (O + W)",
    gestion: baseGestion({ lines: [line(0, "plan-o"), line(1, "plan-w")] }),
  },
  {
    name: "3 líneas — planes distintos (O + W + M)",
    gestion: baseGestion({ lines: [line(0, "plan-o"), line(1, "plan-w"), line(2, "plan-m")] }),
  },
  {
    name: "Upselling / homologación",
    gestion: baseGestion({ lines: [line(0, "plan-o", { isUpselling: true })] }),
  },
];

let failed = 0;

for (const scenario of SCENARIOS) {
  console.log("\n" + "=".repeat(72));
  console.log(`ESCENARIO: ${scenario.name}`);
  console.log("=".repeat(72));

  const ctx = buildScriptContext({
    gestion: scenario.gestion,
    commercialPlans: PLANS,
    advisorPlans,
    advisor: { name: "María Asesora", email: "maria@wom.cl" },
  });

  if (!ctx) {
    console.error("❌ No se pudo construir contexto");
    failed++;
    continue;
  }

  const contratacion = buildContractResumenSpeech(ctx);
  const beneficios = buildMultilineBenefitsSpeech(ctx.vars.nombre_cliente, ctx.lineDetails);
  const blocks = buildTeleprompterBlocks(ctx);

  console.log("\n--- BLOQUE CONTRATACIÓN ---\n");
  console.log(contratacion);

  console.log("\n--- BLOQUE BENEFICIOS ---\n");
  console.log(beneficios);

  const checks: [string, boolean][] = [
    ["Sin placeholders", findUnresolvedPlaceholders(contratacion + beneficios).length === 0],
    ["Sin lista técnica (•)", !beneficios.includes("•")],
    ["Sin repetición 'Contratarás el'", !contratacion.includes("Contratarás el")],
    ["Tiene pregunta datos", contratacion.includes("¿Son correctos tus datos?")],
    ["Tiene disclaimer portabilidad", contratacion.includes("Si por algún motivo el número no se porta")],
    ["9 bloques generados", blocks.length === 9],
  ];

  if (scenario.name.includes("Upselling")) {
    checks.push(["Menciona modificar plan", contratacion.includes("modificar el plan actual")]);
  }

  if (scenario.name.includes("boletas") || scenario.gestion.lines[0]?.planId === "plan-o") {
    checks.push(["Promociones boletas $0", contratacion.includes("boleta $0") || contratacion.includes("boleta")]);
  }

  console.log("\n--- VALIDACIONES ---");
  for (const [label, ok] of checks) {
    console.log(`${ok ? "✅" : "❌"} ${label}`);
    if (!ok) failed++;
  }
}

console.log("\n" + "=".repeat(72));
console.log(failed === 0 ? "✅ Todos los escenarios pasaron" : `❌ ${failed} validación(es) fallida(s)`);
console.log("=".repeat(72));

process.exit(failed > 0 ? 1 : 0);
