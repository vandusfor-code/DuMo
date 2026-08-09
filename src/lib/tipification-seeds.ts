import { TIPIFICATION_BADGE_COLORS, type Tipification } from "@/types/tipification";

/** Catálogo inicial equivalente al enum LeadType + LEAD_TYPE_LABELS. */
export const DEFAULT_TIPIFICATION_SEEDS: Omit<
  Tipification,
  "companyId" | "createdAt" | "updatedAt" | "createdBy"
>[] = [
  {
    id: "tipif-venta",
    slug: "venta",
    name: "Venta",
    ...TIPIFICATION_BADGE_COLORS.active,
    sortOrder: 1,
    triggersSaleFlow: true,
    status: "active",
  },
  {
    id: "tipif-consulta",
    slug: "consulta",
    name: "Consulta",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 2,
    triggersSaleFlow: false,
    status: "active",
  },
  {
    id: "tipif-seguimiento",
    slug: "seguimiento",
    name: "Seguimiento",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 3,
    triggersSaleFlow: false,
    status: "active",
  },
  {
    id: "tipif-no-interesado",
    slug: "no_interesado",
    name: "No interesado",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 4,
    triggersSaleFlow: false,
    status: "active",
  },
  {
    id: "tipif-pendiente",
    slug: "pendiente",
    name: "Pendiente",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 5,
    triggersSaleFlow: false,
    status: "active",
  },
  {
    id: "tipif-reagenda",
    slug: "reagenda",
    name: "Reagenda",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 6,
    triggersSaleFlow: false,
    status: "active",
  },
  {
    id: "tipif-informacion",
    slug: "informacion",
    name: "Información",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 7,
    triggersSaleFlow: false,
    status: "active",
  },
  {
    id: "tipif-otro",
    slug: "otro",
    name: "Otro",
    ...TIPIFICATION_BADGE_COLORS.in_progress,
    sortOrder: 8,
    triggersSaleFlow: false,
    status: "active",
  },
];

export const DEFAULT_TIPIFICATION_SLUGS = DEFAULT_TIPIFICATION_SEEDS.map((t) => t.slug);
