import type { CommercialPlan } from "@/types/commercial-config";
import type { SaveLeadInput } from "@/types/lead";
import { CURRENT_OPERATOR_LABELS } from "@/types/lead";
import { formatCurrency } from "@/lib/format";
import type { Plan } from "@/types/lead";
import {
  buildConversationalBenefitsSpeech,
  buildStructuredBenefitItems,
} from "@/lib/sales-script/teleprompter/plan-benefits-speech";
import { joinNaturalList, toBenefitPhrase } from "@/lib/sales-script/teleprompter/speech-utils";

export type LineSpeechDetail = {
  index: number;
  phone: string;
  planId: string;
  planName: string;
  planValue: number;
  planValueLabel: string;
  benefitItems: string[];
  plan: CommercialPlan | null;
  isMain: boolean;
};

function formatPhone569(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 9) {
    const local = digits.slice(-9);
    return `569-${local.slice(0, 4)}-${local.slice(4)}`;
  }
  return phone;
}

function planById(planId: string, plans: CommercialPlan[]): CommercialPlan | null {
  return plans.find((p) => p.id === planId) ?? null;
}

export function buildBenefitsSpeech(
  clientName: string,
  planName: string,
  planValueLabel: string,
  plan: CommercialPlan | null,
): string {
  return buildConversationalBenefitsSpeech(clientName, planName, planValueLabel, plan);
}

export function buildLineDetails(input: {
  lines: SaveLeadInput["lines"];
  commercialPlans: CommercialPlan[];
  advisorPlans: Plan[];
}): LineSpeechDetail[] {
  return input.lines.map((line, index) => {
    const planDetail = planById(line.planId, input.commercialPlans);
    const advisorPlan = input.advisorPlans.find((p) => p.id === line.planId);
    const planName = planDetail?.name ?? advisorPlan?.name ?? "Plan WOM";
    const planValue = planDetail?.womValue ?? advisorPlan?.womValue ?? 0;
    const benefitItems = planDetail ? buildStructuredBenefitItems(planDetail) : [];
    return {
      index,
      phone: formatPhone569(line.phone),
      planId: line.planId,
      planName,
      planValue,
      planValueLabel: formatCurrency(planValue),
      benefitItems,
      plan: planDetail,
      isMain: index === 0,
    };
  });
}

function buildLineBenefitsParagraph(
  clientName: string,
  line: LineSpeechDetail,
  roleLabel: string,
): string {
  const name = line.isMain ? clientName : clientName;
  const phrases = line.benefitItems.map(toBenefitPhrase);

  if (phrases.length === 0) {
    return `En ${roleLabel}, el ${line.planName} tiene un valor mensual transparente de ${line.planValueLabel}.`;
  }

  if (phrases.length <= 4) {
    return `En ${roleLabel}, el ${line.planName} por ${line.planValueLabel} incluye ${joinNaturalList(phrases)}.`;
  }

  const mid = Math.ceil(phrases.length / 2);
  return `En ${roleLabel}, el ${line.planName} por ${line.planValueLabel} incluye ${joinNaturalList(phrases.slice(0, mid))}. Además, cuenta con ${joinNaturalList(phrases.slice(mid))}.`;
}

export function buildMultilineBenefitsSpeech(
  clientName: string,
  lineDetails: LineSpeechDetail[],
): string {
  const uniquePlans = new Set(lineDetails.map((l) => l.planId));

  if (uniquePlans.size === 1 && lineDetails.length === 1) {
    const line = lineDetails[0];
    return buildBenefitsSpeech(clientName, line.planName, line.planValueLabel, line.plan);
  }

  const parts = lineDetails.map((line) => {
    const role = line.isMain
      ? `tu línea principal (${line.phone})`
      : `tu línea adicional ${line.index} (${line.phone})`;
    return buildLineBenefitsParagraph(clientName, line, role);
  });

  return parts.join("\n\n");
}

export function buildUpsellingSpeech(input: {
  phone: string;
  planName: string;
  planValueLabel: string;
}): string {
  return [
    `Aceptas modificar el plan actual para el número ${input.phone} al nuevo plan ${input.planName} con un monto a pagar de ${input.planValueLabel}.`,
    "",
    "Recuerda que si tenías algún beneficio anterior quedará inválido, pero ganarás los beneficios obtenidos con este nuevo plan.",
  ].join("\n");
}

export function isUpsellingLine(line: SaveLeadInput["lines"][number]): boolean {
  return Boolean(line.isUpselling);
}

export function operatorLabel(op: SaveLeadInput["lines"][number]["currentOperator"]): string {
  return op ? CURRENT_OPERATOR_LABELS[op] : "";
}
