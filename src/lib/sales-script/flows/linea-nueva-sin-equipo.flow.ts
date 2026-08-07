/**
 * Flujo Línea Nueva sin equipo — delega al motor independiente en linea-nueva/.
 * No reutiliza teleprompter/blocks de Portabilidad.
 */

import type { SalesScriptStep } from "@/types/sales-script";
import type { LineaNuevaEngineInput } from "@/lib/sales-script/linea-nueva/linea-nueva-types";
import { buildLineaNuevaSinEquipoSteps } from "@/lib/sales-script/linea-nueva/linea-nueva-bridge";

export const SCRIPT_TIPO = "LINEA_NUEVA_SIN_EQUIPO" as const;

/** Entrada extendida para el registro global — fase 2 unificará con ScriptBuildContext. */
export type LineaNuevaFlowInput = LineaNuevaEngineInput;

export function buildLineaNuevaSinEquipoFlow(input: LineaNuevaFlowInput): SalesScriptStep[] {
  return buildLineaNuevaSinEquipoSteps(input);
}
