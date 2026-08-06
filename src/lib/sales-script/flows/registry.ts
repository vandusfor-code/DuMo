import type { ScriptBuildContext } from "@/lib/sales-script/context";
import type { SalesScriptStep } from "@/types/sales-script";
import {
  buildPortabilidadSinEquipoFlow,
  SCRIPT_TIPO as PORTABILIDAD_SIN_EQUIPO_KEY,
} from "@/lib/sales-script/flows/portabilidad-sin-equipo.flow";

export type ScriptFlowDefinition = {
  key: string;
  title: string;
  buildSteps: (ctx: ScriptBuildContext) => SalesScriptStep[];
};

/**
 * Registro central de flujos de script.
 * Cada tipo de venta aporta solo reglas + bloques; el motor (context, UI, builder) es compartido.
 */
export const SCRIPT_FLOW_REGISTRY: Record<string, ScriptFlowDefinition> = {
  [PORTABILIDAD_SIN_EQUIPO_KEY]: {
    key: PORTABILIDAD_SIN_EQUIPO_KEY,
    title: "Portabilidad sin equipo",
    buildSteps: buildPortabilidadSinEquipoFlow,
  },
  // PORTABILIDAD_CON_EQUIPO: { ... } — futuro: importar buildPortabilidadConEquipoFlow
  // LINEA_NUEVA: { ... }
  // RENOVACION: { ... }
};

/** Resuelve el flujo aplicable según datos de la venta. */
export function resolveScriptFlow(ctx: ScriptBuildContext): ScriptFlowDefinition {
  if (ctx.saleType === "portability" && !ctx.hasEquipment) {
    return SCRIPT_FLOW_REGISTRY[PORTABILIDAD_SIN_EQUIPO_KEY];
  }
  // Placeholder hasta implementar otros flujos — mantiene extensibilidad del registro.
  return SCRIPT_FLOW_REGISTRY[PORTABILIDAD_SIN_EQUIPO_KEY];
}
