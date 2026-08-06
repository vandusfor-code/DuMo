/**
 * Teleprompter — 12 bloques de lectura continua.
 * Fuente: SPEC-teleprompter-portabilidad-sin-equipo.md + portabilidad-sin-equipo.raw.txt
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";
import {
  buildContractDataValidationIntro,
  buildContractSummarySpeech,
} from "@/lib/sales-script/contract-resumen";
import { buildMultilineBenefitsSpeech } from "@/lib/sales-script/teleprompter/speech-builders";
import { buildBlock1SaludoSpeech } from "@/lib/sales-script/teleprompter/block1-saludo-speech";
import { buildBlock2AudioSpeech } from "@/lib/sales-script/teleprompter/block2-audio-speech";
import { buildBlock5DeliverySpeech } from "@/lib/sales-script/teleprompter/block5-delivery-speech";
import { buildBlock6PortabilitySpeech } from "@/lib/sales-script/teleprompter/block6-portability-speech";
import { buildBlock7GiftSpeech } from "@/lib/sales-script/teleprompter/block7-gift-speech";
import { buildBlock8SurveySpeech } from "@/lib/sales-script/teleprompter/block8-survey-speech";
import { buildBlock9AcceptanceSpeech } from "@/lib/sales-script/teleprompter/block9-acceptance-speech";
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

/** Bloque 6 — Proceso de portabilidad ✅ Aprobado v1.0 (congelado). */
function buildBlock6Portabilidad(ctx: ScriptBuildContext): { content: string; branch: SalesScriptBranch } {
  return buildBlock6PortabilitySpeech({
    clientFirstName: n(ctx),
    currentOperatorLabel: v(ctx, "operador_actual"),
    requiresCapCode: ctx.requiresCapCode,
  });
}

function buildBlock5CondicionesEntrega(ctx: ScriptBuildContext): string {
  return buildBlock5DeliverySpeech({
    deliveryIsHome: ctx.deliveryIsHome,
    deliveryIsStore: ctx.deliveryIsStore,
    contactPhones: ctx.contactPhones,
    region: v(ctx, "region"),
    comuna: v(ctx, "comuna"),
    direccion: v(ctx, "direccion"),
    fechaEntrega: v(ctx, "fecha_entrega"),
    pickupStoreName: v(ctx, "nombre_sucursal"),
    pickupStoreAddress: v(ctx, "direccion_sucursal"),
    pickupStoreSchedule: v(ctx, "horario_sucursal"),
    isUltraExpressDelivery: ctx.isUltraExpressDelivery,
  });
}

/** Bloque 3 — Contratación ✅ Aprobado v1.0 (congelado). */
function buildBlock3Contratacion(ctx: ScriptBuildContext): { content: string; branch: SalesScriptBranch } {
  return {
    content: buildContractDataValidationIntro(ctx),
    branch: {
      dataValidation: {
        postValidationSpeech: buildContractSummarySpeech(ctx),
        advisorNoteOnNo:
          "El cliente indicó que sus datos no son correctos. Corrige la información en la gestión y, cuando finalices, continúa con el resumen de la contratación.",
      },
    },
  };
}

/** Genera los 12 bloques del teleprompter. */
export function buildTeleprompterBlocks(ctx: ScriptBuildContext): SalesScriptStep[] {
  const block2 = buildBlock2AudioSpeech();
  const block3 = buildBlock3Contratacion(ctx);
  const block6 = buildBlock6Portabilidad(ctx);
  const block8 = buildBlock8SurveySpeech({ clientFirstName: n(ctx) });
  const block9 = buildBlock9AcceptanceSpeech({ clientFirstName: n(ctx) });
  const block10 = buildBlock10Prefijo809Speech({ clientFirstName: n(ctx) });
  const block11 = buildBlock11ReferralSpeech({ clientFirstName: n(ctx) });
  const lineDetails = ctx.lineDetails ?? [];

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
      content: buildMultilineBenefitsSpeech(v(ctx, "nombre_cliente"), lineDetails),
    },
    /** Bloque 5 — Condiciones generales y entrega ✅ Aprobado v1.0 (congelado). */
    {
      id: "bloque-5",
      sectionLabel: "Entrega",
      content: buildBlock5CondicionesEntrega(ctx),
    },
    /** Bloque 6 — Proceso de portabilidad ✅ Aprobado v1.0 (congelado). */
    {
      id: "bloque-6",
      sectionLabel: "Portabilidad",
      content: block6.content,
      branch: block6.branch,
    },
    {
      id: "bloque-7",
      sectionLabel: "Regalo",
      content: buildBlock7GiftSpeech({ clientFirstName: n(ctx) }),
    },
    {
      id: "bloque-8",
      sectionLabel: "Encuesta",
      content: block8.content,
      branch: block8.branch,
    },
    {
      id: "bloque-9",
      sectionLabel: "Aceptación",
      content: block9.content,
      branch: block9.branch,
    },
    {
      id: "bloque-10",
      sectionLabel: "Prefijo 809",
      content: block10.content,
      branch: block10.branch,
    },
    {
      id: "bloque-11",
      sectionLabel: "Referido",
      content: block11.content,
      branch: block11.branch,
    },
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
