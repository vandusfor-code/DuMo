import {
  PORTABILIDAD_SIN_EQUIPO_OFFICIAL,
  SCRIPT_TIPO,
  type OfficialStepTemplate,
} from "@/data/scripts/portabilidad-sin-equipo.official";
import type { ScriptBuildContext } from "./context";
import { renderTemplate } from "./render";
import type { GeneratedSalesScript, SalesScriptStep, StructuredScriptPayload } from "@/types/sales-script";

function buildStructuredPayload(
  templates: OfficialStepTemplate[],
  ctx: ScriptBuildContext,
): StructuredScriptPayload {
  return {
    tipo: SCRIPT_TIPO,
    pasos: templates.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      texto: renderTemplate(t.texto, ctx.vars),
      variables: t.variables,
    })),
  };
}

export function buildOfficialSteps(
  templates: OfficialStepTemplate[],
  ctx: ScriptBuildContext,
): { steps: SalesScriptStep[]; templates: OfficialStepTemplate[]; structured: StructuredScriptPayload } {
  const active = templates.filter((t) => !t.when || t.when(ctx));
  const steps = active.map((t) => ({
    id: String(t.id),
    title: t.titulo,
    content: renderTemplate(t.texto, ctx.vars),
  }));
  const structured = buildStructuredPayload(active, ctx);
  return { steps, templates: active, structured };
}

export function buildPortabilityNoEquipmentScript(ctx: ScriptBuildContext): {
  steps: SalesScriptStep[];
  structured: StructuredScriptPayload;
  flowTitle: string;
  flowKey: string;
} {
  const { steps, structured } = buildOfficialSteps(PORTABILIDAD_SIN_EQUIPO_OFFICIAL, ctx);
  return {
    steps,
    structured,
    flowTitle: "PORTABILIDAD SIN EQUIPO",
    flowKey: SCRIPT_TIPO,
  };
}

export function assembleGeneratedScript(input: {
  gestionId: string;
  conversationId: string;
  ctx: ScriptBuildContext;
  meta: GeneratedSalesScript["meta"];
}): GeneratedSalesScript {
  const built = buildPortabilityNoEquipmentScript(input.ctx);
  return {
    id: `SCRIPT-${Date.now()}`,
    gestionId: input.gestionId,
    conversationId: input.conversationId,
    flowTitle: built.flowTitle,
    flowKey: built.flowKey,
    meta: input.meta,
    steps: built.steps,
    structured: built.structured,
    createdAt: new Date().toISOString(),
  };
}
