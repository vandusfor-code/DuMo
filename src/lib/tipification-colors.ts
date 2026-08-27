import { TIPIFICATION_BADGE_COLORS } from "@/types/tipification";

export type TipificationColorPreset = {
  id: string;
  label: string;
  badgeBg: string;
  badgeText: string;
};

/** Paleta acotada alineada con status-badge.tsx y tokens del CRM. */
export const TIPIFICATION_COLOR_PRESETS: TipificationColorPreset[] = [
  { id: "green", label: "Verde", ...TIPIFICATION_BADGE_COLORS.active },
  { id: "blue", label: "Azul", ...TIPIFICATION_BADGE_COLORS.in_progress },
  { id: "amber", label: "Ámbar", badgeBg: "#FFF7E8", badgeText: "#B54708" },
  { id: "red", label: "Rojo", badgeBg: "#FEF3F2", badgeText: "#B42318" },
  { id: "purple", label: "Morado", badgeBg: "#F4F3FF", badgeText: "#5925DC" },
  { id: "teal", label: "Teal", badgeBg: "#F0FDFA", badgeText: "#0F766E" },
];

export function findTipificationColorPreset(badgeBg: string, badgeText: string) {
  return TIPIFICATION_COLOR_PRESETS.find(
    (p) => p.badgeBg === badgeBg && p.badgeText === badgeText,
  );
}

export function slugifyTipificationName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}
