import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Gift,
  Heart,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import {
  MAX_PINNED_QUICK_REPLIES,
  PINNED_LIMIT_MESSAGE,
  PINNED_QUICK_REPLIES_VISIBLE_IN_CHAT,
} from "@/lib/pinned-quick-replies.constants";

export {
  MAX_PINNED_QUICK_REPLIES,
  PINNED_LIMIT_MESSAGE,
  PINNED_QUICK_REPLIES_VISIBLE_IN_CHAT,
};

export type PinnedShortcutVisual = {
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

const PALETTE: PinnedShortcutVisual[] = [
  { Icon: TrendingUp, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { Icon: Briefcase, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  { Icon: Gift, iconBg: "bg-orange-50", iconColor: "text-orange-500" },
  { Icon: Gift, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
  { Icon: Heart, iconBg: "bg-teal-50", iconColor: "text-teal-600" },
];

const SLUG_VISUAL: Record<string, PinnedShortcutVisual> = {
  saludos: { Icon: Heart, iconBg: "bg-teal-50", iconColor: "text-teal-600" },
  equipos: { Icon: Briefcase, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  planes: { Icon: TrendingUp, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  promociones: { Icon: Gift, iconBg: "bg-orange-50", iconColor: "text-orange-500" },
  documentos: { Icon: MessageCircle, iconBg: "bg-slate-100", iconColor: "text-slate-600" },
  pagos: { Icon: TrendingUp, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  despedidas: { Icon: Heart, iconBg: "bg-rose-50", iconColor: "text-rose-500" },
};

function matchNameVisual(name: string): PinnedShortcutVisual | null {
  const n = name.toLowerCase();
  if (n.includes("saludo")) {
    return { Icon: Heart, iconBg: "bg-teal-50", iconColor: "text-teal-600" };
  }
  if (n.includes("equipo")) {
    return { Icon: Briefcase, iconBg: "bg-blue-50", iconColor: "text-blue-600" };
  }
  if (n.includes("portabilidad")) {
    return { Icon: Gift, iconBg: "bg-purple-50", iconColor: "text-purple-600" };
  }
  if (n.includes("plan") || n.includes("wom") || n.includes("aumento")) {
    return { Icon: TrendingUp, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" };
  }
  if (n.includes("promo") || n.includes("regalo")) {
    return { Icon: Gift, iconBg: "bg-orange-50", iconColor: "text-orange-500" };
  }
  return null;
}

/** Icono y color por categoría / nombre — estable en el chat. */
export function getPinnedShortcutVisual(input: {
  categorySlug?: string | null;
  name: string;
  index?: number;
}): PinnedShortcutVisual {
  const slug = input.categorySlug?.trim().toLowerCase();
  if (slug && SLUG_VISUAL[slug]) return SLUG_VISUAL[slug];
  const byName = matchNameVisual(input.name);
  if (byName) return byName;
  const idx = input.index ?? 0;
  return PALETTE[idx % PALETTE.length]!;
}
