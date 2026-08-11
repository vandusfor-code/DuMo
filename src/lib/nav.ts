import {
  ArchiveRestore,
  Bell,
  CircleDollarSign,
  FileText,
  HelpCircle,
  Home,
  LineChart,
  LogOut,
  MessagesSquare,
  PhoneCall,
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
 * Sidebar has a single source of truth. Las ventas se registran desde Leads.
 */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Inicio", href: "/dashboard", icon: Home },
  { label: "Mis ventas", href: "/dashboard/mis-ventas", icon: FileText },
  { label: "Leads", href: "/dashboard/leads", icon: MessagesSquare },
  { label: "Recuperación", href: "/dashboard/recuperacion", icon: ArchiveRestore },
  { label: "Ventas por cerrar", href: "/dashboard/ventas-por-cerrar", icon: PhoneCall },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users },
  { label: "Reportes", href: "/dashboard/reportes", icon: LineChart },
  { label: "Comisiones", href: "/dashboard/comisiones", icon: CircleDollarSign },
  { label: "Notificaciones", href: "/dashboard/notificaciones", icon: Bell },
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
