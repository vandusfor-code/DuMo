"use client";

import type { LeadFormValues } from "@/types/lead-form";
import type { SaveLeadAction } from "@/types/crm-client";
import type { Tipification } from "@/types/tipification";
import {
  resolveFollowUpDateForSave,
  validateFollowUpDateForCloseAction,
  type TipificationBehaviorCatalogItem,
} from "@/lib/tipification-follow-up";

export function validateLeadFormBeforeSave(input: {
  values: LeadFormValues;
  saveAction: SaveLeadAction;
  catalog: TipificationBehaviorCatalogItem[];
  triggersSaleFlow: (slug: string) => boolean;
  opensCustomForm?: (slug: string) => boolean;
  isCompleteSaleLine: (line: LeadFormValues["lines"][number]) => boolean;
}): { ok: true; followUpDate: string | null } | { ok: false; message: string; field?: keyof LeadFormValues } {
  if (input.triggersSaleFlow(input.values.type)) {
    const completeLines = input.values.lines.filter(input.isCompleteSaleLine);
    if (completeLines.length === 0) {
      return {
        ok: false,
        message:
          "Completa al menos una línea con número, tipo de venta, plan, región y comuna.",
      };
    }
    return { ok: true, followUpDate: null };
  }

  if (input.opensCustomForm?.(input.values.type)) {
    const duo = input.values.duo;
    if (!duo.plan.trim() || !duo.saleType || !duo.region || !duo.comuna) {
      return {
        ok: false,
        message:
          "Completa al menos plan, tipo de venta, región y comuna de Operación Duo.",
      };
    }
    return { ok: true, followUpDate: null };
  }

  if (input.saveAction !== "close") {
    return { ok: true, followUpDate: null };
  }

  const followUpError = validateFollowUpDateForCloseAction({
    slug: input.values.type,
    catalog: input.catalog,
    followUpDate: input.values.followUpDate,
    saveAction: input.saveAction,
  });
  if (followUpError) {
    return { ok: false, message: followUpError, field: "followUpDate" };
  }

  const resolved = resolveFollowUpDateForSave({
    slug: input.values.type,
    catalog: input.catalog,
    followUpDate: input.values.followUpDate,
  });

  return { ok: true, followUpDate: resolved.followUpDate };
}
