/**
 * Teleprompter — Portabilidad con Equipo.
 * Orquestador de bloques (en construcción bloque por bloque).
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { buildBlock1SaludoSpeech } from "@/lib/sales-script/teleprompter/block1-saludo-speech";
import { buildBlock2AudioSpeech } from "@/lib/sales-script/teleprompter/block2-audio-speech";
import { buildBlock3ContratacionConEquipoSpeech } from "@/lib/sales-script/teleprompter/block3-contratacion-con-equipo-speech";
import { buildBlock4PlanBenefitsConEquipoSpeech } from "@/lib/sales-script/teleprompter/block4-plan-benefits-con-equipo-speech";
import { buildBlock5CondicionesEntregaConEquipoSpeech } from "@/lib/sales-script/teleprompter/block5-condiciones-entrega-con-equipo-speech";
import { buildBlock6PortabilitySpeech } from "@/lib/sales-script/teleprompter/block6-portability-speech";
import type { SalesScriptBranch, SalesScriptStep } from "@/types/sales-script";

function v(ctx: ScriptBuildContext, key: string): string {
  return ctx.vars[key] ?? "";
}

function n(ctx: ScriptBuildContext): string {
  return v(ctx, "cliente_primer_nombre") || v(ctx, "nombre_cliente");
}

/** Bloque 6 — Proceso de portabilidad ✅ Bloque transversal v1.0 (congelado). */
function buildBlock6Portabilidad(ctx: ScriptBuildContext): { content: string; branch: SalesScriptBranch } {
  return buildBlock6PortabilitySpeech({
    clientFirstName: n(ctx),
    currentOperatorLabel: v(ctx, "operador_actual"),
    requiresCapCode: ctx.requiresCapCode,
  });
}

export function buildTeleprompterBlocksConEquipo(ctx: ScriptBuildContext): SalesScriptStep[] {
  const block2 = buildBlock2AudioSpeech();
  const block3 = buildBlock3ContratacionConEquipoSpeech(ctx);
  const block6 = buildBlock6Portabilidad(ctx);

  return [
    {
      id: "bloque-1",
      sectionLabel: "Inicio",
      content: buildBlock1SaludoSpeech(ctx),
    },
    {
      id: "bloque-2",
      sectionLabel: "Audio",
      content: block2.content,
      branch: block2.branch,
    },
    /** Bloque 3 — Contratación ✅ Aprobado v1.0 (congelado). */
    {
      id: "bloque-3",
      sectionLabel: "Contratación",
      content: block3.content,
      branch: block3.branch,
    },
    /** Bloque 4 — Beneficios del plan ✅ Aprobado v1.0 (congelado). */
    {
      id: "bloque-4",
      sectionLabel: "Plan",
      content: buildBlock4PlanBenefitsConEquipoSpeech(ctx),
    },
    /** Bloque 5 — Condiciones generales y entrega ✅ Aprobado v1.0 (congelado). */
    {
      id: "bloque-5",
      sectionLabel: "Entrega",
      content: buildBlock5CondicionesEntregaConEquipoSpeech(ctx),
    },
    /** Bloque 6 — Proceso de portabilidad ✅ Bloque transversal v1.0 (congelado). */
    {
      id: "bloque-6",
      sectionLabel: "Portabilidad",
      content: block6.content,
      branch: block6.branch,
    },
  ];
}
