import type {
  CommercialPlan,
  PlanFreeBills,
  PlanOffer,
  PlanPedidosYaPlus,
} from "@/types/commercial-config";
import type { LeadSaleType } from "@/types/lead";
import { formatCurrency } from "@/lib/format";

export const DEFAULT_CLUB_BENEFITS = ["Cinépolis", "Farmacias Ahumada", "Lipigas"];

export const EMPTY_PLAN_OFFER: PlanOffer = {
  dataAllowance: "",
  unlimitedMinutes: false,
  unlimitedSms: false,
  freeApps: false,
  roamingWhatsapp: false,
  roamingGb: null,
  additionalLinePrice: null,
  maxAdditionalLines: 0,
  clubWom: false,
  clubBenefits: [],
  handsetCoupon: null,
  freeDeviceInstallments: null,
  pedidosYaPlus: null,
  freeBills: {
    billNumbers: [],
    appliesToMainLine: false,
    appliesToAdditionalLines: false,
  },
};

/** Oferta Comercial Julio 2026 — Plan W. */
export const PLAN_W_OFFER: PlanOffer = {
  dataAllowance: "150 GB",
  unlimitedMinutes: true,
  unlimitedSms: true,
  freeApps: true,
  roamingWhatsapp: false,
  roamingGb: null,
  additionalLinePrice: null,
  maxAdditionalLines: 0,
  clubWom: true,
  clubBenefits: [...DEFAULT_CLUB_BENEFITS],
  handsetCoupon: null,
  freeDeviceInstallments: null,
  pedidosYaPlus: null,
  freeBills: {
    billNumbers: [3, 6],
    appliesToMainLine: true,
    appliesToAdditionalLines: false,
  },
};

/** Oferta Comercial Julio 2026 — Plan O. */
export const PLAN_O_OFFER: PlanOffer = {
  dataAllowance: "300 GB",
  unlimitedMinutes: true,
  unlimitedSms: true,
  freeApps: true,
  roamingWhatsapp: true,
  roamingGb: null,
  additionalLinePrice: 7_990,
  maxAdditionalLines: 4,
  clubWom: true,
  clubBenefits: [...DEFAULT_CLUB_BENEFITS],
  handsetCoupon: {
    enabled: true,
    percent: 10,
    limitAmount: 100_000,
    periodMonths: 24,
  },
  freeDeviceInstallments: {
    enabled: true,
    installmentNumbers: [18],
  },
  pedidosYaPlus: null,
  freeBills: {
    billNumbers: [3, 6],
    appliesToMainLine: true,
    appliesToAdditionalLines: true,
  },
};

/** Oferta Comercial Julio 2026 — Plan M. */
export const PLAN_M_OFFER: PlanOffer = {
  dataAllowance: "GB Libres",
  unlimitedMinutes: true,
  unlimitedSms: true,
  freeApps: true,
  roamingWhatsapp: true,
  roamingGb: 3,
  additionalLinePrice: 7_990,
  maxAdditionalLines: 4,
  clubWom: true,
  clubBenefits: [...DEFAULT_CLUB_BENEFITS],
  handsetCoupon: {
    enabled: true,
    percent: 10,
    limitAmount: 100_000,
    periodMonths: 12,
  },
  freeDeviceInstallments: {
    enabled: true,
    installmentNumbers: [17, 18],
  },
  pedidosYaPlus: {
    enabled: true,
    conditions:
      "Incluido sin costo adicional por 12 meses. No debes haber tenido una suscripción activa en los últimos 3 meses. Si ya tienes el servicio activo, el beneficio puede extenderse a un tercero. Se activa mediante un correo con enlace enviado por WOM.",
  },
  freeBills: {
    billNumbers: [3, 6],
    appliesToMainLine: true,
    appliesToAdditionalLines: true,
  },
};

const OFFER_BY_PLAN_ID: Record<string, PlanOffer> = {
  "plan-w": PLAN_W_OFFER,
  "plan-o": PLAN_O_OFFER,
  "plan-m": PLAN_M_OFFER,
};

/** Migra datos legacy (specs / promotions / benefits) al modelo estructurado. */
export function resolvePlanOffer(raw: {
  id: string;
  offer?: PlanOffer;
  specs?: {
    gb?: string;
    minutes?: string;
    sms?: string;
    appsLibres?: string;
    roaming?: string;
    clubWom?: string;
    pedidosYa?: string;
    cuponEquipos?: string;
    cuotasGratis?: string;
    maxAdditionalLines?: number;
  };
  promotions?: string[];
  additionalLineValue?: number;
}): PlanOffer {
  if (raw.offer) return raw.offer;
  if (OFFER_BY_PLAN_ID[raw.id]) return { ...OFFER_BY_PLAN_ID[raw.id] };

  const specs = raw.specs;
  if (!specs) return { ...EMPTY_PLAN_OFFER };

  const isActive = (v?: string) => {
    const t = v?.trim();
    return Boolean(t) && !/^(no|no aplica)$/i.test(t!);
  };

  const billNumbers = (raw.promotions ?? [])
    .map((p) => {
      const m = p.match(/(\d+)/);
      return m ? Number(m[1]) : null;
    })
    .filter((n): n is number => n !== null);

  return {
    dataAllowance: specs.gb ?? "",
    unlimitedMinutes: isActive(specs.minutes),
    unlimitedSms: isActive(specs.sms),
    freeApps: isActive(specs.appsLibres),
    roamingWhatsapp: isActive(specs.roaming),
    roamingGb: specs.roaming?.includes("3 GB") ? 3 : null,
    additionalLinePrice: raw.additionalLineValue && raw.additionalLineValue > 0 ? raw.additionalLineValue : null,
    maxAdditionalLines: specs.maxAdditionalLines ?? 0,
    clubWom: isActive(specs.clubWom),
    clubBenefits: isActive(specs.clubWom) ? [...DEFAULT_CLUB_BENEFITS] : [],
    handsetCoupon: isActive(specs.cuponEquipos)
      ? {
          enabled: true,
          percent: 10,
          limitAmount: 100_000,
          periodMonths: specs.cuponEquipos?.includes("24") ? 24 : 12,
        }
      : null,
    freeDeviceInstallments: isActive(specs.cuotasGratis)
      ? {
          enabled: true,
          installmentNumbers: specs.cuotasGratis?.includes("17") ? [17, 18] : [18],
        }
      : null,
    pedidosYaPlus: isActive(specs.pedidosYa)
      ? { enabled: true, conditions: PLAN_M_OFFER.pedidosYaPlus!.conditions }
      : null,
    freeBills: {
      billNumbers: billNumbers.length > 0 ? billNumbers : [],
      appliesToMainLine: billNumbers.length > 0,
      appliesToAdditionalLines: billNumbers.length > 0,
    },
  };
}

export function deriveAdditionalLineValue(offer: PlanOffer): number {
  return offer.additionalLinePrice ?? 0;
}

export function deriveMaxLines(offer: PlanOffer): number {
  return 1 + Math.max(0, offer.maxAdditionalLines);
}

export function formatFreeBillsLabels(billNumbers: number[]): string[] {
  return billNumbers.map((n) => `${n}° boleta $0`);
}

export function buildFreeBillsPromotionSuffix(input: {
  freeBills: PlanFreeBills;
  saleType: LeadSaleType;
  isMainLine: boolean;
}): string {
  const { freeBills, saleType, isMainLine } = input;
  if (freeBills.billNumbers.length === 0) return "";

  const applies = isMainLine
    ? freeBills.appliesToMainLine
    : freeBills.appliesToAdditionalLines &&
      (saleType === "portability" || saleType === "new_line");

  if (!applies) return "";

  const labels = formatFreeBillsLabels(freeBills.billNumbers);
  const list =
    labels.length === 1
      ? labels[0]
      : labels.length === 2
        ? `${labels[0]} y ${labels[1]}`
        : `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;

  return `, con ${list} aplicables en los meses correspondientes de tu facturación`;
}

type ContractPromotionInput = {
  saleType: LeadSaleType;
  lineDetails: Array<{
    isMain: boolean;
    plan: { offer: { freeBills: PlanFreeBills } } | null;
  }>;
};

/**
 * Boletas $0 para el discurso de contratación — reglas de Oferta Comercial por línea,
 * sin asociar la promoción al plan principal de la venta.
 */
export function buildContractPromotionSuffix(input: ContractPromotionInput): string {
  const billNumbers = new Set<number>();

  for (const line of input.lineDetails) {
    const freeBills = line.plan?.offer.freeBills;
    if (!freeBills || freeBills.billNumbers.length === 0) continue;

    const applies = line.isMain
      ? freeBills.appliesToMainLine
      : freeBills.appliesToAdditionalLines &&
        (input.saleType === "portability" || input.saleType === "new_line");

    if (!applies) continue;
    freeBills.billNumbers.forEach((n) => billNumbers.add(n));
  }

  if (billNumbers.size === 0) return "";

  const labels = formatFreeBillsLabels([...billNumbers].sort((a, b) => a - b));
  const list =
    labels.length === 1
      ? labels[0]
      : labels.length === 2
        ? `${labels[0]} y ${labels[1]}`
        : `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;

  return `, con ${list} aplicables en los meses correspondientes de tu facturación`;
}

/** Construye frases de beneficios desde la oferta estructurada. */
export function buildBenefitPhrasesFromOffer(plan: CommercialPlan): string[] {
  const o = plan.offer;
  const phrases: string[] = [];

  if (o.dataAllowance.trim()) {
    phrases.push(`${o.dataAllowance} para navegar en red 5G`);
  }
  if (o.unlimitedMinutes && o.unlimitedSms) {
    phrases.push("minutos y SMS libres");
  } else {
    if (o.unlimitedMinutes) phrases.push("minutos libres");
    if (o.unlimitedSms) phrases.push("SMS libres");
  }
  if (o.freeApps) phrases.push("Apps Libres");

  if (o.roamingWhatsapp && o.roamingGb) {
    phrases.push(`WhatsApp Libre más ${o.roamingGb} GB para roaming internacional`);
  } else if (o.roamingWhatsapp) {
    phrases.push("WhatsApp Libre en roaming internacional");
  }

  if (o.additionalLinePrice && o.maxAdditionalLines > 0) {
    phrases.push(
      `posibilidad de hasta ${o.maxAdditionalLines} líneas adicionales por ${formatCurrency(o.additionalLinePrice)} cada una`,
    );
  }

  if (o.pedidosYaPlus?.enabled) {
    phrases.push("suscripción incluida a PedidosYa Plus");
  }

  if (o.clubWom) {
    const partners =
      o.clubBenefits.length > 0 ? o.clubBenefits.join(", ") : "comercios aliados";
    phrases.push(`acceso a Club WOM con descuentos exclusivos en ${partners}`);
  }

  if (o.handsetCoupon?.enabled) {
    phrases.push(
      `cupón del ${o.handsetCoupon.percent}% de descuento para equipos y accesorios con tope de ${formatCurrency(o.handsetCoupon.limitAmount)} cada ${o.handsetCoupon.periodMonths} meses`,
    );
  }

  if (o.freeDeviceInstallments?.enabled && o.freeDeviceInstallments.installmentNumbers.length > 0) {
    const nums = o.freeDeviceInstallments.installmentNumbers;
    if (nums.length === 1) {
      phrases.push(`última cuota gratis al financiar un equipo (cuota ${nums[0]})`);
    } else {
      phrases.push(`cuotas ${nums.join(" y ")} gratis al financiar un equipo`);
    }
  }

  return phrases;
}

export function buildPedidosYaConditionsParagraph(plan: CommercialPlan): string | null {
  const py = plan.offer.pedidosYaPlus;
  if (!py?.enabled || !py.conditions.trim()) return null;
  return py.conditions.endsWith(".") ? py.conditions : `${py.conditions}.`;
}
