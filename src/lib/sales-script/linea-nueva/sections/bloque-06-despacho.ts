/**
 * Bloque 6 — Despacho
 * ✅ CONGELADO v1.0 — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [14]–[18]
 * Builder: módulo `delivery/linea-nueva-delivery-speech.ts` (modular, no Portabilidad)
 */

import { buildLineaNuevaDeliverySpeech } from "../delivery/linea-nueva-delivery-speech";
import type { LineaNuevaDeliverySpeechInput } from "../delivery/linea-nueva-delivery-types";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";
import type { SalesScriptBranch } from "@/types/sales-script";
import {
  LINEA_NUEVA_BLOQUE06_ADVISOR_NOTE_DELIVERY_DATE,
  LINEA_NUEVA_BLOQUE06_ADVISOR_NOTE_HOME_RECEIVER,
} from "./bloque-06-despacho.constants";
import { assertLineaNuevaBloque06Ready } from "./bloque-06-despacho.validation";

function formatPhone569(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 9) {
    const local = digits.slice(-9);
    return `569-${local.slice(0, 4)}-${local.slice(4)}`;
  }
  return phone;
}

export function buildLineaNuevaDeliverySpeechInput(
  ctx: LineaNuevaScriptContext,
): LineaNuevaDeliverySpeechInput {
  const despacho = ctx.despacho;

  return {
    deliveryIsHome: despacho.tipo === "domicilio",
    deliveryIsStore: despacho.tipo === "tienda",
    region: despacho.region,
    comuna: despacho.comuna,
    direccion: despacho.direccionEntrega,
    contactPhones: despacho.contactPhones.map(formatPhone569),
    fechaEntrega: despacho.fechaEntrega,
    carrier: despacho.carrier,
    pickupStoreName: despacho.tiendaNombre,
    pickupStoreAddress: despacho.tiendaDireccion,
    pickupStoreSchedule: despacho.tiendaHorario,
  };
}

export function buildLineaNuevaBloque06Despacho(ctx: LineaNuevaScriptContext): {
  content: string;
  branch: SalesScriptBranch;
} {
  const readyCtx = assertLineaNuevaBloque06Ready(ctx);
  const input = buildLineaNuevaDeliverySpeechInput(readyCtx);

  return {
    content: buildLineaNuevaDeliverySpeech(input),
    branch:
      readyCtx.despacho.tipo === "domicilio"
        ? {
            despacho: {
              advisorNoteOnBlockStart: [
                LINEA_NUEVA_BLOQUE06_ADVISOR_NOTE_HOME_RECEIVER,
                LINEA_NUEVA_BLOQUE06_ADVISOR_NOTE_DELIVERY_DATE,
              ].join(" "),
            },
          }
        : {
            despacho: {
              advisorNoteOnBlockStart: LINEA_NUEVA_BLOQUE06_ADVISOR_NOTE_DELIVERY_DATE,
            },
          },
  };
}

/** Bloque 6 — Despacho ✅ CONGELADO v1.0 */
export const lineaNuevaBloque06Despacho: LineaNuevaSectionModule = {
  id: "despacho",
  label: "Despacho",
  register({ ctx, builder }) {
    const step = buildLineaNuevaBloque06Despacho(ctx);
    builder.section("despacho", "Despacho");
    builder.addStep(step);
    builder.endSection();
  },
};
