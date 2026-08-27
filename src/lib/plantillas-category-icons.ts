import {
  Calendar,
  CreditCard,
  FileText,
  Folder,
  Hand,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  Package,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export type CategoryVisual = {
  icon: LucideIcon;
  iconClass: string;
  bgClass: string;
};

const DEFAULT_VISUAL: CategoryVisual = {
  icon: Folder,
  iconClass: "text-muted",
  bgClass: "bg-canvas",
};

const BY_SLUG: Record<string, CategoryVisual> = {
  promociones: { icon: Megaphone, iconClass: "text-brand", bgClass: "bg-brand-soft" },
  equipos: { icon: Smartphone, iconClass: "text-success-ink", bgClass: "bg-success-soft" },
  soporte: { icon: LifeBuoy, iconClass: "text-warning-ink", bgClass: "bg-warning-soft" },
  planes: { icon: Package, iconClass: "text-[#2563eb]", bgClass: "bg-[#e8f0fe]" },
  documentos: { icon: FileText, iconClass: "text-[#c11574]", bgClass: "bg-[#fce7f3]" },
  permanencia: { icon: Calendar, iconClass: "text-[#0e7490]", bgClass: "bg-[#cffafe]" },
  saludos: { icon: MessageCircle, iconClass: "text-brand", bgClass: "bg-brand-soft" },
  despedidas: { icon: Hand, iconClass: "text-muted", bgClass: "bg-canvas" },
  pagos: { icon: CreditCard, iconClass: "text-success-ink", bgClass: "bg-success-soft" },
};

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "-");
}

export function getCategoryVisual(slug: string, name: string): CategoryVisual {
  const bySlug = BY_SLUG[normalizeKey(slug)];
  if (bySlug) return bySlug;
  const byName = BY_SLUG[normalizeKey(name)];
  if (byName) return byName;
  return DEFAULT_VISUAL;
}
