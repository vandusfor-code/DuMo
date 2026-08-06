/**
 * Flujo Portabilidad con Equipo → teleprompter (bloques pendientes de implementación).
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { buildTeleprompterBlocksConEquipo } from "@/lib/sales-script/teleprompter/blocks-con-equipo";
import type { SalesScriptStep } from "@/types/sales-script";

export const SCRIPT_TIPO = "PORTABILIDAD_CON_EQUIPO" as const;

export function buildPortabilidadConEquipoFlow(ctx: ScriptBuildContext): SalesScriptStep[] {
  return buildTeleprompterBlocksConEquipo(ctx);
}
