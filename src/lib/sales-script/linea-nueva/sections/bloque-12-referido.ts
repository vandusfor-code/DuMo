/**
 * Bloque 12 — Referido
 * ✅ CONGELADO v1.0 — AUDITORÍA DOCUMENTAL APROBADA — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [32]
 * Builder: buildBlock11ReferralSpeech (transversal Portabilidad v1.0)
 */

import { buildBlock11ReferralSpeech } from "@/lib/sales-script/teleprompter/block11-referral-speech";
import type { SalesScriptBranch } from "@/types/sales-script";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import {
  assertLineaNuevaBloque12Ready,
  lineaNuevaReferidoClientFirstName,
} from "./bloque-12-referido.validation";

export function buildLineaNuevaBloque12Referido(ctx: LineaNuevaScriptContext): {
  content: string;
  branch: SalesScriptBranch;
} {
  const readyCtx = assertLineaNuevaBloque12Ready(ctx);

  return buildBlock11ReferralSpeech({
    clientFirstName: lineaNuevaReferidoClientFirstName(readyCtx),
  });
}

/** Bloque 12 — Referido ✅ CONGELADO v1.0 */
export const lineaNuevaBloque12Referido: LineaNuevaSectionModule = {
  id: "referido",
  label: "Referido",
  register({ ctx, builder }) {
    const step = buildLineaNuevaBloque12Referido(ctx);
    builder.section("referido", "Referido");
    builder.addStep(step);
    builder.endSection();
  },
};
