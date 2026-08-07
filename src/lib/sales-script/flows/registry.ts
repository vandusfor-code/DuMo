import type { ScriptBuildContext } from "@/lib/sales-script/context";
import type { SalesScriptStep } from "@/types/sales-script";
import {
  buildPortabilidadConEquipoFlow,
  SCRIPT_TIPO as PORTABILIDAD_CON_EQUIPO_KEY,
} from "@/lib/sales-script/flows/portabilidad-con-equipo.flow";
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
 * Línea Nueva: motor separado en linea-nueva/ — NO registrado hasta documento oficial.
 */
export const SCRIPT_FLOW_REGISTRY: Record<string, ScriptFlowDefinition> = {
  [PORTABILIDAD_SIN_EQUIPO_KEY]: {
    key: PORTABILIDAD_SIN_EQUIPO_KEY,
    title: "Portabilidad sin equipo",
    buildSteps: buildPortabilidadSinEquipoFlow,
  },
  [PORTABILIDAD_CON_EQUIPO_KEY]: {
    key: PORTABILIDAD_CON_EQUIPO_KEY,
    title: "Portabilidad con equipo",
    buildSteps: buildPortabilidadConEquipoFlow,
  },
};

function requireRegisteredFlow(key: string): ScriptFlowDefinition {
  const flow = SCRIPT_FLOW_REGISTRY[key];
  if (!flow) {
    throw new Error(
      `No hay flujo de teleprompter registrado para la clave "${key}". Verifica SCRIPT_FLOW_REGISTRY.`,
    );
  }
  return flow;
}

/** Resuelve el flujo aplicable según datos de la venta. Sin fallback a flujos incorrectos. */
export function resolveScriptFlow(ctx: ScriptBuildContext): ScriptFlowDefinition {
  if (ctx.saleType === "portability" && !ctx.hasEquipment) {
    return requireRegisteredFlow(PORTABILIDAD_SIN_EQUIPO_KEY);
  }

  if (ctx.saleType === "portability" && ctx.hasEquipment) {
    return requireRegisteredFlow(PORTABILIDAD_CON_EQUIPO_KEY);
  }

  const saleLabel = ctx.saleType;
  const equipmentSuffix = ctx.hasEquipment ? " con equipo" : " sin equipo";
  throw new Error(
    `No hay flujo de teleprompter registrado para "${saleLabel}"${equipmentSuffix}.`,
  );
}
