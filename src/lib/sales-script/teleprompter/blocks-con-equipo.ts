/**
 * Teleprompter — Portabilidad con Equipo (12 bloques).
 * Orquestador completo — pendiente congelamiento v1.0 tras auditoría.
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { buildBlock1SaludoSpeech } from "@/lib/sales-script/teleprompter/block1-saludo-speech";
import { buildBlock2AudioSpeech } from "@/lib/sales-script/teleprompter/block2-audio-speech";
import { buildBlock3ContratacionConEquipoSpeech } from "@/lib/sales-script/teleprompter/block3-contratacion-con-equipo-speech";
import { buildBlock4PlanBenefitsConEquipoSpeech } from "@/lib/sales-script/teleprompter/block4-plan-benefits-con-equipo-speech";
import { buildBlock5CondicionesEntregaConEquipoSpeech } from "@/lib/sales-script/teleprompter/block5-condiciones-entrega-con-equipo-speech";
import { buildBlock6PortabilitySpeech } from "@/lib/sales-script/teleprompter/block6-portability-speech";
import { buildBlock7GiftSpeech } from "@/lib/sales-script/teleprompter/block7-gift-speech";
import { buildBlock8SurveySpeech } from "@/lib/sales-script/teleprompter/block8-survey-speech";
import { buildBlock9AcceptanceConEquipoSpeech } from "@/lib/sales-script/teleprompter/block9-acceptance-con-equipo-speech";
import { buildBlock10Prefijo809Speech } from "@/lib/sales-script/teleprompter/block10-prefijo809-speech";
import { buildBlock11ReferralSpeech } from "@/lib/sales-script/teleprompter/block11-referral-speech";
import { buildBlock12FarewellSpeech } from "@/lib/sales-script/teleprompter/block12-farewell-speech";
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
  const block8 = buildBlock8SurveySpeech({ clientFirstName: n(ctx) });
  const block9 = buildBlock9AcceptanceConEquipoSpeech({ clientFirstName: n(ctx) });
  const block10 = buildBlock10Prefijo809Speech({ clientFirstName: n(ctx) });
  const block11 = buildBlock11ReferralSpeech({ clientFirstName: n(ctx) });

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
    /** Bloque 7 — Chip prepago de regalo ✅ Bloque transversal v1.0 (congelado). */
    {
      id: "bloque-7",
      sectionLabel: "Regalo",
      content: buildBlock7GiftSpeech({ clientFirstName: n(ctx) }),
    },
    /** Bloque 8 — Encuesta NPS ✅ Bloque transversal v1.0 (congelado). */
    {
      id: "bloque-8",
      sectionLabel: "Encuesta",
      content: block8.content,
      branch: block8.branch,
    },
    /** Bloque 9 — Aceptación + VDI (Con Equipo — dos contratos). */
    {
      id: "bloque-9",
      sectionLabel: "Aceptación",
      content: block9.content,
      branch: block9.branch,
    },
    /** Bloque 10 — Prefijo 809 ✅ Bloque transversal v1.0 (congelado). */
    {
      id: "bloque-10",
      sectionLabel: "Prefijo 809",
      content: block10.content,
      branch: block10.branch,
    },
    /** Bloque 11 — Referido ✅ Bloque transversal v1.0 (congelado). */
    {
      id: "bloque-11",
      sectionLabel: "Referido",
      content: block11.content,
      branch: block11.branch,
    },
    /** Bloque 12 — Despedida ✅ Bloque transversal v1.0 (congelado). */
    {
      id: "bloque-12",
      sectionLabel: "Cierre",
      content: buildBlock12FarewellSpeech({
        executiveEmail: v(ctx, "correo_ejecutivo"),
        executiveName: v(ctx, "nombre_ejecutivo"),
      }),
    },
  ];
}
