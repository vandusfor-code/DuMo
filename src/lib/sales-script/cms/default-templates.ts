import type { SalesScriptStep } from "@/types/sales-script";
import { buildTeleprompterBlocks } from "@/lib/sales-script/teleprompter/blocks";
import { SCRIPT_TIPO as PORTABILIDAD_SIN_EQUIPO_KEY } from "@/lib/sales-script/flows/portabilidad-sin-equipo.flow";
import { LINEA_NUEVA_SIN_EQUIPO_FLOW_KEY } from "@/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "@/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "@/lib/sales-script/linea-nueva/linea-nueva-rules";
import { registerLineaNuevaSections } from "@/lib/sales-script/linea-nueva/sections/registry";
import { toSalesScriptSteps } from "@/lib/sales-script/linea-nueva/linea-nueva-renderer";
import { validateLineaNuevaContext } from "@/lib/sales-script/linea-nueva/validation";
import type { ScriptFlowKey, ScriptFlowCatalog } from "./types";
import { extractEditableFieldsFromStep, getStepFieldValue } from "./field-utils";
import { extractTokensFromTemplate, textToTemplate } from "./template-utils";
import {
  buildCmsLineaNuevaContext,
  buildCmsLineaNuevaInput,
  buildCmsPortabilidadContext,
  previewVarsForLineaNueva,
  previewVarsFromContext,
} from "./mock-context";

export function buildDefaultStepsForFlow(flowKey: ScriptFlowKey): SalesScriptStep[] {
  if (flowKey === PORTABILIDAD_SIN_EQUIPO_KEY) {
    return buildTeleprompterBlocks(buildCmsPortabilidadContext());
  }

  const ctx = buildCmsLineaNuevaContext();
  const validation = validateLineaNuevaContext(ctx);
  if (!validation.ok) {
    throw new Error(validation.errors[0]?.message ?? "Contexto Línea Nueva inválido para CMS.");
  }

  const ruleEvaluation = lineaNuevaRuleEngine.evaluate(ctx);
  const builder = new LineaNuevaScriptBuilder(ctx, ruleEvaluation.flags);
  registerLineaNuevaSections({
    ctx,
    flags: ruleEvaluation.flags,
    builder,
  });
  const sections = builder.finish().filter((section) => !section.skipped);
  return toSalesScriptSteps(sections);
}

export function buildFlowCatalog(flowKey: ScriptFlowKey): ScriptFlowCatalog {
  const steps = buildDefaultStepsForFlow(flowKey);
  const title =
    flowKey === PORTABILIDAD_SIN_EQUIPO_KEY
      ? "Portabilidad sin equipo"
      : "Línea Nueva sin equipo";

  return {
    flowKey,
    title,
    blocks: steps.map((step, index) => ({
      blockId: step.id,
      label: step.sectionLabel ?? step.title ?? `Bloque ${index + 1}`,
      fields: extractEditableFieldsFromStep(step),
    })),
  };
}

export function buildDefaultTemplateForField(input: {
  flowKey: ScriptFlowKey;
  blockId: string;
  fieldKey: string;
}): { defaultTemplate: string; requiredTokens: string[] } {
  const steps = buildDefaultStepsForFlow(input.flowKey);
  const step = steps.find((item) => item.id === input.blockId);
  if (!step) {
    throw new Error(`Bloque ${input.blockId} no encontrado en ${input.flowKey}.`);
  }

  const resolved = getStepFieldValue(step, input.fieldKey);
  if (resolved == null) {
    throw new Error(`Campo ${input.fieldKey} no encontrado en ${input.blockId}.`);
  }

  const vars =
    input.flowKey === LINEA_NUEVA_SIN_EQUIPO_FLOW_KEY
      ? previewVarsForLineaNueva()
      : previewVarsFromContext(buildCmsPortabilidadContext());

  const defaultTemplate = textToTemplate(resolved, vars);
  return {
    defaultTemplate,
    requiredTokens: extractTokensFromTemplate(defaultTemplate),
  };
}

export const SCRIPT_FLOW_CATALOG: ScriptFlowCatalog[] = [
  buildFlowCatalog(PORTABILIDAD_SIN_EQUIPO_KEY),
  buildFlowCatalog(LINEA_NUEVA_SIN_EQUIPO_FLOW_KEY),
];

export { PORTABILIDAD_SIN_EQUIPO_KEY, LINEA_NUEVA_SIN_EQUIPO_FLOW_KEY };

/** Evita tree-shaking del input LN en builds de análisis estático. */
void buildCmsLineaNuevaInput;
