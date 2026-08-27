/**
 * P1.3 — verifica reglas de fecha de seguimiento y saveAction close.
 * Uso: npx tsx scripts/verify-p13-follow-up-logic.ts
 */

import { buildFallbackTipificationCatalog } from "../src/lib/tipification-utils";
import {
  computeDefaultFollowUpDate,
  getFollowUpDateUiConfig,
  resolveFollowUpDateForSave,
  validateFollowUpDateForCloseAction,
} from "../src/lib/tipification-follow-up";

const catalog = buildFallbackTipificationCatalog();

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("OK:", message);
  }
}

const consulta = getFollowUpDateUiConfig("consulta", catalog);
assert(!consulta.showField && !consulta.required, "consulta — sin campo fecha");

const permanencia = getFollowUpDateUiConfig("permanencia", catalog);
assert(
  permanencia.showField && permanencia.required && permanencia.uiMode === "manual",
  "permanencia — manual obligatorio sin sugerencia",
);

const deuda = getFollowUpDateUiConfig("deuda", catalog);
assert(
  deuda.showField && deuda.uiMode === "manual_suggested" && deuda.suggestedDefaultDays === 7,
  "deuda — manual_suggested +7",
);

const deudaWom = getFollowUpDateUiConfig("deuda_wom", catalog);
assert(
  deudaWom.uiMode === "manual_suggested" && deudaWom.suggestedDefaultDays === 7,
  "deuda_wom — misma matriz que deuda (fallback P1.6)",
);

const noResponde = getFollowUpDateUiConfig("no_responde", catalog);
assert(!noResponde.showField && noResponde.uiMode === "fixed" && noResponde.fixedDays === 2, "no_responde — automático +2 sin UI");

const emptyPermanencia = validateFollowUpDateForCloseAction({
  slug: "permanencia",
  catalog,
  followUpDate: "",
  saveAction: "close",
});
assert(emptyPermanencia !== null, "permanencia vacía bloquea close");

const fixedNoResponde = resolveFollowUpDateForSave({
  slug: "no_responde",
  catalog,
  followUpDate: null,
  now: new Date("2026-08-09T12:00:00"),
});
assert(
  fixedNoResponde.error === null && fixedNoResponde.followUpDate === "2026-08-11",
  "no_responde resuelve hoy+2 automático",
);

const suggestedDeuda = computeDefaultFollowUpDate(7, new Date("2026-08-09T12:00:00"));
assert(suggestedDeuda === "2026-08-16", "sugerencia +7 días");

const scriptSkips = validateFollowUpDateForCloseAction({
  slug: "permanencia",
  catalog,
  followUpDate: "",
  saveAction: "script",
});
assert(scriptSkips === null, "saveAction script no exige fecha");

if (process.exitCode) {
  console.error("\nVerificación P1.3 falló.");
  process.exit(1);
}

console.log("\nOK: reglas P1.3 verificadas.");
