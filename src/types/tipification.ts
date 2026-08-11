/** Colores de badge alineados con status-badge.tsx (variantes active / in_progress). */
export const TIPIFICATION_BADGE_COLORS = {
  active: { badgeBg: "#ECFDF3", badgeText: "#027A48" },
  in_progress: { badgeBg: "#EEF4FF", badgeText: "#3538CD" },
} as const;

export type TipificationStatus = "active" | "inactive";

/** Cómo se calcula la fecha de seguimiento al tipificar. */
export type TipificationFollowUpMode =
  | "none"
  | "fixed"
  | "manual"
  | "manual_suggested";

export interface Tipification {
  id: string;
  companyId: string;
  slug: string;
  name: string;
  badgeBg: string;
  badgeText: string;
  sortOrder: number;
  triggersSaleFlow: boolean;
  /** Si true, la gestión puede sacar el chat de la bandeja activa (P1). */
  closesInbox: boolean;
  /** Si true, crea fila en lead_follow_ups (P4). */
  createsFollowUp: boolean;
  /**
   * Si true, el panel de gestión muestra un formulario propio en vez del
   * flujo estándar (líneas de venta). Usado por Operación Duo; pensado para
   * ser reutilizable por futuras tipificaciones con formulario especial.
   */
  opensCustomForm: boolean;
  followUpMode: TipificationFollowUpMode;
  /** Días para modo fixed o sugerencia en manual_suggested (ej. deuda +7). */
  followUpDefaultDays: number | null;
  status: TipificationStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type CreateTipificationInput = {
  name: string;
  slug?: string;
  badgeBg: string;
  badgeText: string;
  sortOrder?: number;
  triggersSaleFlow?: boolean;
  closesInbox?: boolean;
  createsFollowUp?: boolean;
  opensCustomForm?: boolean;
  followUpMode?: TipificationFollowUpMode;
  followUpDefaultDays?: number | null;
  status?: TipificationStatus;
};

export type UpdateTipificationInput = Partial<CreateTipificationInput>;

export type TipificationWithUsage = Tipification & {
  usageCount: number;
};

export type TipificationDeleteCheck = {
  usageCount: number;
  canDelete: boolean;
};
