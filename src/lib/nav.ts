import {
  Bell,
  CircleDollarSign,
  FileText,
  HelpCircle,
  Home,
  LineChart,
  LogOut,
  Plus,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Numeric badge shown on the right of the item (e.g. notifications). */
  badge?: number;
};

/**
 * Primary navigation — kept identical across every screen so the shared
 * Sidebar has a single source of truth. "Nueva Venta" lives here as a nav
 * item (per product decision); the Dashboard additionally exposes it as a
 * header CTA.
 */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Inicio", href: "/dashboard", icon: Home },
  { label: "Nueva Venta", href: "/dashboard/nueva-venta", icon: Plus },
  { label: "Mis ventas", href: "/dashboard/mis-ventas", icon: FileText },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users },
  { label: "Reportes", href: "/dashboard/reportes", icon: LineChart },
  { label: "Comisiones", href: "/dashboard/comisiones", icon: CircleDollarSign },
  { label: "Notificaciones", href: "/dashboard/notificaciones", icon: Bell, badge: 3 },
];

/** Secondary navigation — visually separated from the primary group. */
export const SECONDARY_NAV: NavItem[] = [
  { label: "Perfil", href: "/dashboard/perfil", icon: User },
  { label: "Ayuda", href: "/dashboard/ayuda", icon: HelpCircle },
];

export const SIGN_OUT_ITEM: NavItem = {
  label: "Cerrar sesión",
  href: "/logout",
  icon: LogOut,
};
