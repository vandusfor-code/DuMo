import type { ScriptBuildContext } from "./context";
import {
  buildPortabilidadSinEquipoFlow,
  SCRIPT_TIPO,
} from "./flows/portabilidad-sin-equipo.flow";
import type { GeneratedSalesScript, StructuredScriptPayload } from "@/types/sales-script";

export function buildPortabilityNoEquipmentScript(ctx: ScriptBuildContext): {
  steps: GeneratedSalesScript["steps"];
  structured: StructuredScriptPayload;
  flowTitle: string;
  flowKey: string;
} {
  const steps = buildPortabilidadSinEquipoFlow(ctx);
  const structured: StructuredScriptPayload = {
    tipo: SCRIPT_TIPO,
    pasos: steps.map((s, i) => ({
      id: i + 1,
      titulo: s.title,
      texto: s.content,
      variables: [],
    })),
  };
  return {
    steps,
    structured,
    flowTitle: "Portabilidad sin equipo",
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
