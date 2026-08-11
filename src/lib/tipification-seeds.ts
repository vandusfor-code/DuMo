import { TIPIFICATION_BADGE_COLORS, type Tipification } from "@/types/tipification";

type TipificationSeed = Omit<
  Tipification,
  "companyId" | "createdAt" | "updatedAt" | "createdBy"
>;

/** Catálogo inicial — matriz P0.3 (8 slugs legacy; nuevos slugs en P1.6). */
export const DEFAULT_TIPIFICATION_SEEDS: TipificationSeed[] = [
  {
    id: "tipif-venta",
    slug: "venta",
    name: "Venta",
    ...TIPIFICATION_BADGE_COLORS.active,
    sortOrder: 1,
    triggersSaleFlow: true,
    closesInbox: true,
    createsFollowUp: false,
    opensCustomForm: false,
    followUpMode: "none",
    followUpDefaultDays: null,
    status: "active",
  },
  {
    id: "tipif-consulta",
    slug: "consulta",
    name: "Consulta",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 2,
    triggersSaleFlow: false,
    closesInbox: true,
    createsFollowUp: false,
    opensCustomForm: false,
    followUpMode: "none",
    followUpDefaultDays: null,
    status: "active",
  },
  {
    id: "tipif-seguimiento",
    slug: "seguimiento",
    name: "Seguimiento",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 3,
    triggersSaleFlow: false,
    closesInbox: true,
    createsFollowUp: true,
    opensCustomForm: false,
    followUpMode: "manual",
    followUpDefaultDays: null,
    status: "active",
  },
  {
    id: "tipif-no-interesado",
    slug: "no_interesado",
    name: "No interesado",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 4,
    triggersSaleFlow: false,
    closesInbox: true,
    createsFollowUp: false,
    opensCustomForm: false,
    followUpMode: "none",
    followUpDefaultDays: null,
    status: "active",
  },
  {
    id: "tipif-pendiente",
    slug: "pendiente",
    name: "Pendiente",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 5,
    triggersSaleFlow: false,
    closesInbox: true,
    createsFollowUp: true,
    opensCustomForm: false,
    followUpMode: "manual",
    followUpDefaultDays: null,
    status: "active",
  },
  {
    id: "tipif-reagenda",
    slug: "reagenda",
    name: "Reagenda",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 6,
    triggersSaleFlow: false,
    closesInbox: true,
    createsFollowUp: true,
    opensCustomForm: false,
    followUpMode: "manual",
    followUpDefaultDays: null,
    status: "active",
  },
  {
    id: "tipif-informacion",
    slug: "informacion",
    name: "Información",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 7,
    triggersSaleFlow: false,
    closesInbox: true,
    createsFollowUp: false,
    opensCustomForm: false,
    followUpMode: "none",
    followUpDefaultDays: null,
    status: "active",
  },
  {
    id: "tipif-otro",
    slug: "otro",
    name: "Otro",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 8,
    triggersSaleFlow: false,
    closesInbox: true,
    createsFollowUp: false,
    opensCustomForm: false,
    followUpMode: "none",
    followUpDefaultDays: null,
    status: "active",
  },
];

export const DEFAULT_TIPIFICATION_SLUGS = DEFAULT_TIPIFICATION_SEEDS.map((t) => t.slug);

/**
 * P1.6 — ejecutado vía runTipificationP16Migrations.
 * Historial existente de deuda_wom / deuda_compania_donante no se reasigna.
 */
export const P16_TIPIFICATION_PLAN = {
  updates: [
    {
      id: "tipif-1786266090816-rcnnvl",
      slug: "permanencia",
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual" as const,
      followUpDefaultDays: null,
    },
    {
      id: "tipif-1786266069311-tim48d",
      slug: "deuda_wom",
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual_suggested" as const,
      followUpDefaultDays: 7,
    },
    {
      id: "tipif-1786266123898-r5mu78",
      slug: "deuda_compania_donante",
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual_suggested" as const,
      followUpDefaultDays: 7,
    },
  ],
  inserts: [
    {
      id: "tipif-deuda",
      slug: "deuda",
      name: "Deuda",
      sortOrder: 9,
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual_suggested" as const,
      followUpDefaultDays: 7,
    },
    {
      id: "tipif-sin-cupo",
      slug: "sin_cupo",
      name: "Sin cupo",
      sortOrder: 10,
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual" as const,
      followUpDefaultDays: null,
    },
    {
      id: "tipif-no-responde",
      slug: "no_responde",
      name: "No responde",
      sortOrder: 11,
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "fixed" as const,
      followUpDefaultDays: 2,
    },
    {
      id: "tipif-cliente-indica-fecha",
      slug: "cliente_indica_fecha",
      name: "Cliente indica fecha",
      sortOrder: 12,
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual" as const,
      followUpDefaultDays: null,
    },
  ],
} as const;

/**
 * DUO-1 — tipificación "Operación Duo": aislada en su propio plan de
 * migración (no reutiliza P16) para que sea fácil de revisar/revertir sin
 * tocar el resto del catálogo.
 */
export const DUO_TIPIFICATION_PLAN = {
  inserts: [
    {
      id: "tipif-operacion-duo",
      slug: "operacion_duo",
      name: "Operación Duo",
      sortOrder: 13,
      triggersSaleFlow: false,
      closesInbox: true,
      createsFollowUp: false,
      opensCustomForm: true,
      followUpMode: "none" as const,
      followUpDefaultDays: null,
    },
  ],
} as const;

/**
 * Estado neutral con el que arranca toda conversación nueva (sin gestión
 * guardada aún), hasta que se tipifique manualmente — sortOrder 0 para que
 * aparezca primero en el selector. No dispara flujo de venta, no cierra la
 * bandeja ni crea seguimiento: es un placeholder, no una disposición real.
 */
export const NEW_LEAD_TIPIFICATION_PLAN = {
  inserts: [
    {
      id: "tipif-nuevo-lead",
      slug: "nuevo_lead",
      name: "Nuevo lead",
      sortOrder: 0,
      triggersSaleFlow: false,
      closesInbox: false,
      createsFollowUp: false,
      opensCustomForm: false,
      followUpMode: "none" as const,
      followUpDefaultDays: null,
    },
  ],
} as const;
