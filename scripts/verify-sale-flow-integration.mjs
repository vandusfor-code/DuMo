#!/usr/bin/env node
/**
 * Verificación de integración del flujo de venta (etapa 3d) — lógica compartida + BD.
 * Uso: npx --yes tsx scripts/verify-sale-flow-integration.mjs
 */

import {
  buildFallbackTipificationCatalog,
  triggersSaleFlowFromCatalog,
} from "../src/lib/tipification-utils.ts";
import { isScriptEligible, getScriptUnavailableReason } from "../src/lib/sales-script/eligibility.ts";
import { leadGestionToNewSaleInput } from "../src/lib/lead-save.ts";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";
import postgres from "postgres";

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    console.log(`  OK  ${name}`);
    passed += 1;
  } else {
    console.error(` FAIL ${name}`);
    failed += 1;
  }
}

const sampleGestion = {
  conversationId: "conv-test",
  phone: "+56912345678",
  customerName: "Cliente Test",
  rut: "11.111.111-1",
  type: "venta",
  notes: "",
  lines: [
    {
      phone: "+56912345678",
      saleType: "portability",
      planId: "plan-test",
      equipment: "",
      equipmentMode: "none",
      currentOperator: "",
      deliveryType: "",
      email: "",
      deliveryAddress: "",
      region: "",
      comuna: "",
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
  saveAction: "script",
  registerSale: false,
};

const catalog = buildFallbackTipificationCatalog();

console.log("=== triggersSaleFlow (catálogo) ===");
assert("venta → true", triggersSaleFlowFromCatalog("venta", catalog));
assert("consulta → false", !triggersSaleFlowFromCatalog("consulta", catalog));

const isSaleFlow = triggersSaleFlowFromCatalog("venta", catalog);
const saleFlowOptions = { isSaleFlowType: isSaleFlow };

console.log("\n=== eligibility + lead-save ===");
assert("isScriptEligible con venta", isScriptEligible(sampleGestion, saleFlowOptions));
assert(
  "getScriptUnavailableReason null con venta + línea",
  getScriptUnavailableReason(sampleGestion, saleFlowOptions) === null,
);
assert(
  "leadGestionToNewSaleInput genera venta",
  leadGestionToNewSaleInput(sampleGestion, saleFlowOptions) !== null,
);

const nonSaleGestion = { ...sampleGestion, type: "consulta" };
const nonSaleFlow = triggersSaleFlowFromCatalog("consulta", catalog);
assert(
  "consulta NO genera venta",
  leadGestionToNewSaleInput(nonSaleGestion, { isSaleFlowType: nonSaleFlow }) === null,
);

console.log("\n=== coherencia BD tipificaciones ===");
const url = loadRailwayTestDatabaseUrl();
if (url) {
  const sql = postgres(url, { ssl: "require", prepare: false });
  try {
    const rows = await sql`
      SELECT slug, triggers_sale_flow FROM tipifications
      WHERE company_id = 'company-default'
      ORDER BY sort_order ASC
    `;
    const dbCatalog = rows.map((r) => ({
      slug: r.slug,
      triggersSaleFlow: r.triggers_sale_flow,
    }));
    assert("BD lookup venta", triggersSaleFlowFromCatalog("venta", dbCatalog));
    assert("BD lookup seguimiento", !triggersSaleFlowFromCatalog("seguimiento", dbCatalog));
  } finally {
    await sql.end({ timeout: 5 });
  }
} else {
  console.log("  (omitido — sin RAILWAY_TEST_DATABASE_URL)");
}

console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
console.log(
  "\nFlujo compartido OK. Verificación manual UI: Tipificación Venta → SaleDetails, Script, Nueva venta, Clientes, teleprompter.",
);
