/**
 * P1.4 — reglas de cierre de bandeja (incl. venta condicional).
 * Uso: npx tsx scripts/verify-p14-inbox-lifecycle-logic.ts
 */

import { buildFallbackTipificationCatalog } from "../src/lib/tipification-utils";
import { shouldCloseInboxAfterSave } from "../src/lib/tipification-follow-up";

const catalog = buildFallbackTipificationCatalog();

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("OK:", message);
  }
}

const ventaBehavior = catalog.find((t) => t.slug === "venta")!;
const consultaBehavior = catalog.find((t) => t.slug === "consulta")!;

assert(
  shouldCloseInboxAfterSave({
    behavior: ventaBehavior,
    saveAction: "sale",
    saleRegistered: true,
  }),
  "venta + sale OK → cierra bandeja",
);

assert(
  !shouldCloseInboxAfterSave({
    behavior: ventaBehavior,
    saveAction: "sale",
    saleRegistered: false,
  }),
  "venta + sale fallida → NO cierra bandeja",
);

assert(
  shouldCloseInboxAfterSave({
    behavior: ventaBehavior,
    saveAction: "script",
    saleRegistered: true,
  }),
  "venta + script con venta OK → cierra bandeja",
);

assert(
  shouldCloseInboxAfterSave({
    behavior: consultaBehavior,
    saveAction: "close",
    saleRegistered: false,
  }),
  "consulta + guardar y cerrar → cierra bandeja",
);

if (process.exitCode) {
  console.error("\nVerificación lógica P1.4 falló.");
  process.exit(1);
}

console.log("\nOK: reglas P1.4 (venta condicional) verificadas.");
