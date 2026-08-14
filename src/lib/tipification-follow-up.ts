import { DEFAULT_TIPIFICATION_SEEDS, P16_TIPIFICATION_PLAN } from "@/lib/tipification-seeds";
import { TIPIFICATION_BEHAVIOR_DEFAULTS } from "@/lib/tipification-behavior";
import type { SaveLeadAction } from "@/types/crm-client";
import type { Tipification, TipificationFollowUpMode } from "@/types/tipification";

export type FollowUpDateUiMode = "hidden" | "manual" | "manual_suggested" | "fixed";

export type FollowUpDateUiConfig = {
  showField: boolean;
  required: boolean;
  uiMode: FollowUpDateUiMode;
  suggestedDefaultDays: number | null;
  fixedDays: number | null;
};

type FollowUpBehavior = Pick<
  Tipification,
  "createsFollowUp" | "followUpMode" | "followUpDefaultDays"
>;

export type TipificationBehavior = Pick<
  Tipification,
  | "closesInbox"
  | "createsFollowUp"
  | "followUpMode"
  | "followUpDefaultDays"
  | "triggersSaleFlow"
>;

function behaviorFromPartial(input: Partial<TipificationBehavior>): TipificationBehavior {
  return {
    closesInbox: input.closesInbox ?? TIPIFICATION_BEHAVIOR_DEFAULTS.closesInbox,
    createsFollowUp: input.createsFollowUp ?? TIPIFICATION_BEHAVIOR_DEFAULTS.createsFollowUp,
    followUpMode: input.followUpMode ?? TIPIFICATION_BEHAVIOR_DEFAULTS.followUpMode,
    followUpDefaultDays:
      input.followUpDefaultDays !== undefined
        ? input.followUpDefaultDays
        : TIPIFICATION_BEHAVIOR_DEFAULTS.followUpDefaultDays,
    triggersSaleFlow: input.triggersSaleFlow ?? false,
  };
}

function catalogHasBehavior(
  item: Pick<
    Tipification,
    "closesInbox" | "createsFollowUp" | "followUpMode" | "followUpDefaultDays" | "triggersSaleFlow"
  >,
): boolean {
  return (
    item.closesInbox ||
    item.createsFollowUp ||
    item.followUpMode !== "none" ||
    item.followUpDefaultDays != null ||
    item.triggersSaleFlow
  );
}

/** Resuelve matriz completa: catálogo BD → plan P1.6 → seeds legacy. */
export function resolveTipificationBehavior(
  slug: string,
  catalog: TipificationBehaviorCatalogItem[],
): TipificationBehavior {
  const fromCatalog = catalog.find((item) => item.slug === slug);
  if (fromCatalog && catalogHasBehavior(fromCatalog)) {
    return behaviorFromPartial(fromCatalog);
  }

  const p16Update = P16_TIPIFICATION_PLAN.updates.find((item) => item.slug === slug);
  if (p16Update) return behaviorFromPartial(p16Update);

  const p16Insert = P16_TIPIFICATION_PLAN.inserts.find((item) => item.slug === slug);
  if (p16Insert) return behaviorFromPartial(p16Insert);

  const seed = DEFAULT_TIPIFICATION_SEEDS.find((item) => item.slug === slug);
  if (seed) return behaviorFromPartial(seed);

  return behaviorFromPartial({});
}

/** Resuelve comportamiento de seguimiento: catálogo BD → plan P1.6 → seeds legacy. */
export function resolveFollowUpBehavior(
  slug: string,
  catalog: TipificationBehaviorCatalogItem[],
): FollowUpBehavior {
  const behavior = resolveTipificationBehavior(slug, catalog);
  return {
    createsFollowUp: behavior.createsFollowUp,
    followUpMode: behavior.followUpMode,
    followUpDefaultDays: behavior.followUpDefaultDays,
  };
}

/** Venta cierra bandeja solo si la venta se registró OK; demás tipificaciones al guardar y cerrar. */
export function shouldCloseInboxAfterSave(input: {
  behavior: Pick<TipificationBehavior, "closesInbox" | "triggersSaleFlow">;
  saveAction: SaveLeadAction;
  saleRegistered: boolean;
}): boolean {
  if (!input.behavior.closesInbox) return false;

  if (input.behavior.triggersSaleFlow) {
    return (
      input.saleRegistered &&
      (input.saveAction === "sale" || input.saveAction === "script")
    );
  }

  return input.saveAction === "close";
}

export type TipificationBehaviorCatalogItem = Pick<
  Tipification,
  "slug" | "closesInbox" | "createsFollowUp" | "followUpMode" | "followUpDefaultDays" | "triggersSaleFlow"
>;

export function getFollowUpDateUiConfig(
  slug: string,
  catalog: TipificationBehaviorCatalogItem[],
): FollowUpDateUiConfig {
  const behavior = resolveFollowUpBehavior(slug, catalog);

  if (!behavior.createsFollowUp || behavior.followUpMode === "none") {
    return {
      showField: false,
      required: false,
      uiMode: "hidden",
      suggestedDefaultDays: null,
      fixedDays: null,
    };
  }

  if (behavior.followUpMode === "fixed") {
    return {
      showField: false,
      required: false,
      uiMode: "fixed",
      suggestedDefaultDays: null,
      fixedDays: behavior.followUpDefaultDays ?? 2,
    };
  }

  if (behavior.followUpMode === "manual_suggested") {
    return {
      showField: true,
      required: true,
      uiMode: "manual_suggested",
      suggestedDefaultDays: behavior.followUpDefaultDays ?? 7,
      fixedDays: null,
    };
  }

  return {
    showField: true,
    required: true,
    uiMode: "manual",
    suggestedDefaultDays: null,
    fixedDays: null,
  };
}

export function addCalendarDays(from: Date, days: number): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result;
}

/** Fecha local yyyy-mm-dd para input[type=date]. */
export function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function computeDefaultFollowUpDate(days: number, from = new Date()): string {
  return formatDateInputValue(addCalendarDays(from, days));
}

export function isValidFollowUpDateInput(value: string | undefined | null): boolean {
  if (!value?.trim()) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime());
}

export function resolveFollowUpDateForSave(input: {
  slug: string;
  catalog: TipificationBehaviorCatalogItem[];
  followUpDate?: string | null;
  now?: Date;
}): { followUpDate: string | null; error: string | null } {
  const config = getFollowUpDateUiConfig(input.slug, input.catalog);
  const now = input.now ?? new Date();

  if (config.uiMode === "hidden") {
    return { followUpDate: null, error: null };
  }

  if (config.uiMode === "fixed") {
    const days = config.fixedDays ?? 2;
    return { followUpDate: computeDefaultFollowUpDate(days, now), error: null };
  }

  const value = input.followUpDate?.trim() ?? "";
  if (!isValidFollowUpDateInput(value)) {
    return {
      followUpDate: null,
      error: "Indica una fecha de seguimiento válida para continuar.",
    };
  }

  return { followUpDate: value, error: null };
}

/** Solo valida cuando saveAction es close (Guardar y cerrar). */
export function validateFollowUpDateForCloseAction(input: {
  slug: string;
  catalog: TipificationBehaviorCatalogItem[];
  followUpDate?: string | null;
  saveAction?: string;
  now?: Date;
}): string | null {
  if (input.saveAction !== "close") return null;
  return resolveFollowUpDateForSave(input).error;
}

export function followUpModeLabel(mode: TipificationFollowUpMode): string {
  switch (mode) {
    case "manual_suggested":
      return "Fecha sugerida editable";
    case "manual":
      return "Fecha obligatoria";
    case "fixed":
      return "Automática";
    default:
      return "";
  }
}
