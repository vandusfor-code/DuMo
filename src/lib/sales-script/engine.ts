import type { ScriptBuildContext } from "./context";
import { resolveScriptFlow } from "./flows/registry";
import type { GeneratedSalesScript, StructuredScriptPayload } from "@/types/sales-script";

export function assembleGeneratedScript(input: {
  gestionId: string;
  conversationId: string;
  ctx: ScriptBuildContext;
  meta: GeneratedSalesScript["meta"];
}): GeneratedSalesScript {
  const flow = resolveScriptFlow(input.ctx);
  const steps = flow.buildSteps(input.ctx);
  const structured: StructuredScriptPayload = {
    tipo: flow.key,
    pasos: steps.map((s, i) => ({
      id: i + 1,
      titulo: s.sectionLabel ?? s.title ?? "",
      texto: s.content,
      variables: [],
    })),
  };

  return {
    id: `SCRIPT-${Date.now()}`,
    gestionId: input.gestionId,
    conversationId: input.conversationId,
    flowTitle: flow.title,
    flowKey: flow.key,
    meta: {
      ...input.meta,
      accountModalityLabel:
        input.ctx.accountType === "prepaid" ? "Prepago → Postpago" : "Postpago → Postpago",
    },
    steps,
    structured,
    createdAt: new Date().toISOString(),
  };
}

/** @deprecated Usar assembleGeneratedScript — mantiene compatibilidad con imports existentes. */
export function buildPortabilityNoEquipmentScript(ctx: ScriptBuildContext) {
  const flow = resolveScriptFlow(ctx);
  const steps = flow.buildSteps(ctx);
  return {
    steps,
    structured: {
      tipo: flow.key,
      pasos: steps.map((s, i) => ({
        id: i + 1,
        titulo: s.sectionLabel ?? s.title ?? "",
        texto: s.content,
        variables: [],
      })),
    },
    flowTitle: flow.title,
    flowKey: flow.key,
  };
}
