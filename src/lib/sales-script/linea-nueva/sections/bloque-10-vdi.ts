/**
 * Bloque 10 — Aceptación final + VDI
 * ✅ CONGELADO v1.0 — AUDITORÍA DOCUMENTAL APROBADA — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [23]–[25]
 * Builder: buildBlock9AcceptanceSpeech (transversal Portabilidad v1.0)
 */

import { buildBlock9AcceptanceSpeech } from "@/lib/sales-script/teleprompter/block9-acceptance-speech";
import type { SalesScriptBranch } from "@/types/sales-script";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import {
  assertLineaNuevaBloque10Ready,
  lineaNuevaVdiClientFirstName,
} from "./bloque-10-vdi.validation";

export function buildLineaNuevaBloque10Vdi(ctx: LineaNuevaScriptContext): {
  content: string;
  branch: SalesScriptBranch;
} {
  const readyCtx = assertLineaNuevaBloque10Ready(ctx);

  return buildBlock9AcceptanceSpeech({
    clientFirstName: lineaNuevaVdiClientFirstName(readyCtx),
  });
}

/** Bloque 10 — VDI ✅ CONGELADO v1.0 */
export const lineaNuevaBloque10Vdi: LineaNuevaSectionModule = {
  id: "vdi",
  label: "VDI",
  register({ ctx, builder }) {
    const step = buildLineaNuevaBloque10Vdi(ctx);
    builder.section("vdi", "VDI");
    builder.addStep(step);
    builder.endSection();
  },
};
