/**
 * Vista previa del párrafo EQUIPO — Bloque 3 (solo local).
 * npx tsx scripts/preview-block3-equipment-only.ts
 */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { EQUIPMENT_CATALOG_MOCK } from "../src/data/mock/equipment.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildBlock3EquipmentFinancingSpeech } from "../src/lib/sales-script/teleprompter/block3-equipment-financing-speech";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => ["plan-o", "plan-m"].includes(p.id));
const EQ = EQUIPMENT_CATALOG_MOCK[0];
const EQ_ZERO = { ...EQ, id: "eq-zero-pie", downPayment: 0 };
const CATALOG = [...EQUIPMENT_CATALOG_MOCK, EQ_ZERO];

function gestion(downPayment: number, equipmentId: string): SaveLeadInput {
  const item = equipmentId === EQ_ZERO.id ? EQ_ZERO : EQ;
  return {
    conversationId: "conv-preview-equip",
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines: [
      {
        phone: "56912345670",
        saleType: "portability",
        planId: "plan-o",
        equipment: item.commercialName,
        equipmentMode: "with",
        currentOperator: "movistar",
        deliveryType: "home",
        email: "cliente@test.cl",
        deliveryAddress: "Av. Providencia 123",
        region: "metropolitana",
        comuna: "Providencia",
        equipmentCatalogId: equipmentId,
        equipmentModel: `${item.brand} ${item.model}`.trim(),
        equipmentValue: String(item.totalValue),
        equipmentDownPayment: String(downPayment),
        equipmentInstallments: String(item.installmentsCount),
        equipmentInstallmentValue: String(item.installmentValue),
        equipmentCommercialText: item.commercialText,
        accountType: "postpaid",
      },
    ],
  };
}

function show(title: string, input: SaveLeadInput) {
  const ctx = buildScriptContext({
    gestion: input,
    commercialPlans: PLANS,
    equipmentCatalog: CATALOG,
    deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  });
  if (!ctx?.mainEquipment) throw new Error(`Sin equipo: ${title}`);

  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
  console.log(buildBlock3EquipmentFinancingSpeech(ctx.mainEquipment));
}

show("Escenario 1 — Pie $0", gestion(0, EQ_ZERO.id));
show("Escenario 2 — Pie mayor a $0", gestion(EQ.downPayment, EQ.id));
