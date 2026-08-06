/**
 * Flujo Portabilidad sin Equipo → teleprompter de 9 bloques.
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { buildTeleprompterBlocks } from "@/lib/sales-script/teleprompter/blocks";
import type { SalesScriptStep } from "@/types/sales-script";

export const SCRIPT_TIPO = "PORTABILIDAD_SIN_EQUIPO" as const;

export function buildPortabilidadSinEquipoFlow(ctx: ScriptBuildContext): SalesScriptStep[] {
  return buildTeleprompterBlocks(ctx);
}
