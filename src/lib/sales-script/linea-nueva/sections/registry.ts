// TODO (LINEA NUEVA):
// Pendiente implementación desde el documento oficial
// "SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO.docx"
// No implementar contenido hasta realizar la auditoría documental.

import type { LineaNuevaSectionModule } from "../linea-nueva-types";
import type { LineaNuevaScriptBuilder } from "../linea-nueva-builder";
import { lineaNuevaBloque01Introduccion } from "./bloque-01-introduccion";
import { lineaNuevaBloque02Audio } from "./bloque-02-audio";
import { lineaNuevaBloque03ResumenVenta } from "./bloque-03-resumen-venta";
import { lineaNuevaBloque04Beneficios } from "./bloque-04-beneficios";
import { lineaNuevaBloque05Condiciones } from "./bloque-05-condiciones";
import { lineaNuevaBloque06Despacho } from "./bloque-06-despacho";
import { lineaNuevaBloque07Compatibilidad } from "./bloque-07-compatibilidad";
import { lineaNuevaBloque08ChipPrepago } from "./bloque-08-chip-prepago";
import { lineaNuevaBloque09Encuesta } from "./bloque-09-encuesta";
import { lineaNuevaBloque10Vdi } from "./bloque-10-vdi";
import { lineaNuevaBloque11Prefijo809 } from "./bloque-11-prefijo-809";
import { lineaNuevaBloque12Referido } from "./bloque-12-referido";
import { lineaNuevaBloque13Despedida } from "./bloque-13-despedida";

/** Orden oficial — 13 bloques. Todos pendientes de documento oficial. */
export const LINEA_NUEVA_SECTION_PIPELINE: LineaNuevaSectionModule[] = [
  lineaNuevaBloque01Introduccion,
  lineaNuevaBloque02Audio,
  lineaNuevaBloque03ResumenVenta,
  lineaNuevaBloque04Beneficios,
  lineaNuevaBloque05Condiciones,
  lineaNuevaBloque06Despacho,
  lineaNuevaBloque07Compatibilidad,
  lineaNuevaBloque08ChipPrepago,
  lineaNuevaBloque09Encuesta,
  lineaNuevaBloque10Vdi,
  lineaNuevaBloque11Prefijo809,
  lineaNuevaBloque12Referido,
  lineaNuevaBloque13Despedida,
];

export function registerLineaNuevaSections(input: {
  ctx: import("../linea-nueva-types").LineaNuevaScriptContext;
  flags: import("../linea-nueva-types").LineaNuevaRuleFlags;
  builder: LineaNuevaScriptBuilder;
}): void {
  for (const sectionModule of LINEA_NUEVA_SECTION_PIPELINE) {
    sectionModule.register(input);
  }
}
