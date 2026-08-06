import type { LeadLineValues } from "@/types/lead-form";
import type { Plan } from "@/types/lead";
import { formatCurrency } from "@/lib/format";

export type ContractSummary = {
  mainPlanName: string;
  mainPlanValue: number;
  mainPlanValueLabel: string;
  additionalCount: number;
  additionalUnitValue: number | null;
  additionalLabel: string;
  totalMonthly: number;
  totalMonthlyLabel: string;
  lineCount: number;
};

export function computeContractSummary(
  lines: LeadLineValues[],
  plans: Plan[],
): ContractSummary {
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const priced = lines
    .map((line) => ({ line, plan: line.planId ? planMap.get(line.planId) : undefined }))
    .filter((entry) => entry.plan);

  const main = priced[0];
  const additional = priced.slice(1);
  const additionalValues = additional.map((e) => e.plan?.womValue ?? 0);
  const allSameAdditional =
    additionalValues.length > 0 && additionalValues.every((v) => v === additionalValues[0]);
  const additionalUnitValue = allSameAdditional ? additionalValues[0] : null;
  const totalMonthly = priced.reduce((sum, e) => sum + (e.plan?.womValue ?? 0), 0);

  let additionalLabel = "—";
  if (additional.length === 0) {
    additionalLabel = "—";
  } else if (additionalUnitValue !== null) {
    additionalLabel = `${formatCurrency(additionalUnitValue)} c/u`;
  } else {
    additionalLabel = formatCurrency(additionalValues.reduce((a, b) => a + b, 0));
  }

  return {
    mainPlanName: main?.plan?.name ?? "—",
    mainPlanValue: main?.plan?.womValue ?? 0,
    mainPlanValueLabel: main?.plan?.womValue ? formatCurrency(main.plan.womValue) : "—",
    additionalCount: additional.length,
    additionalUnitValue,
    additionalLabel,
    totalMonthly,
    totalMonthlyLabel: totalMonthly > 0 ? formatCurrency(totalMonthly) : "—",
    lineCount: priced.length,
  };
}
