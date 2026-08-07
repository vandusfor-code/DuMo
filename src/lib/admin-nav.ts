import {
  BarChart3,
  Brain,
  CircleDollarSign,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  Smartphone,
  User,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Navegación del área de administración (mockup Dashboard Ejecutivo). */
export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Ventas", href: "/admin/ventas", icon: BarChart3 },
  { label: "Asesoras", href: "/admin/asesoras", icon: Users },
  { label: "Leads", href: "/admin/leads", icon: MessagesSquare },
  { label: "Comisiones", href: "/admin/comisiones", icon: CircleDollarSign },
  { label: "Contabilidad", href: "/admin/contabilidad", icon: ReceiptText },
  { label: "Configuración Comercial", href: "/admin/config-comercial", icon: SlidersHorizontal },
  { label: "Equipos", href: "/admin/equipos", icon: Smartphone },
  { label: "Plantillas", href: "/admin/plantillas", icon: FileText },
  { label: "Inteligencia del Negocio", href: "/admin/inteligencia", icon: Brain },
  { label: "Reportes", href: "/admin/reportes", icon: FileBarChart },
  { label: "Usuarios", href: "/admin/usuarios", icon: UserCog },
  { label: "Configuración", href: "/admin/configuracion", icon: Settings },
  { label: "Perfil", href: "/admin/perfil", icon: User },
];

export const ADMIN_SIGN_OUT = {
  label: "Cerrar sesión",
  href: "/logout",
  icon: LogOut,
};
