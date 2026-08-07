import type { ScriptFlowKey } from "./types";

export const SCRIPT_FLOW_DEFINITIONS: ReadonlyArray<{ flowKey: ScriptFlowKey; title: string }> = [
  { flowKey: "PORTABILIDAD_SIN_EQUIPO", title: "Portabilidad sin equipo" },
  { flowKey: "PORTABILIDAD_CON_EQUIPO", title: "Portabilidad con equipo" },
  { flowKey: "LINEA_NUEVA_SIN_EQUIPO", title: "Línea Nueva sin equipo" },
  { flowKey: "LINEA_NUEVA_CON_EQUIPO", title: "Línea Nueva con equipo" },
];

export function isScriptFlowKey(value: string): value is ScriptFlowKey {
  return SCRIPT_FLOW_DEFINITIONS.some((flow) => flow.flowKey === value);
}

export function getScriptFlowTitle(flowKey: ScriptFlowKey): string {
  return SCRIPT_FLOW_DEFINITIONS.find((flow) => flow.flowKey === flowKey)?.title ?? flowKey;
}

export function isPortabilidadFlow(flowKey: ScriptFlowKey): boolean {
  return flowKey.startsWith("PORTABILIDAD_");
}

export function isLineaNuevaFlow(flowKey: ScriptFlowKey): boolean {
  return flowKey.startsWith("LINEA_NUEVA_");
}

export function flowHasEquipment(flowKey: ScriptFlowKey): boolean {
  return flowKey.endsWith("_CON_EQUIPO");
}
