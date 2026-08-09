/** Colores de badge alineados con status-badge.tsx (variantes active / in_progress). */
export const TIPIFICATION_BADGE_COLORS = {
  active: { badgeBg: "#ECFDF3", badgeText: "#027A48" },
  in_progress: { badgeBg: "#EEF4FF", badgeText: "#3538CD" },
} as const;

export type TipificationStatus = "active" | "inactive";

export interface Tipification {
  id: string;
  companyId: string;
  slug: string;
  name: string;
  badgeBg: string;
  badgeText: string;
  sortOrder: number;
  triggersSaleFlow: boolean;
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
