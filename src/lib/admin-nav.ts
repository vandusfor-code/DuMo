import {
  BarChart3,
  CircleDollarSign,
  Clock,
  Contact,
  FileBarChart,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessagesSquare,
  Mic,
  PhoneCall,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  Smartphone,
  QrCode,
  Radio,
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
  { label: "Pendientes", href: "/admin/pendientes", icon: Clock },
  { label: "Ventas por cerrar", href: "/admin/ventas-por-cerrar", icon: PhoneCall },
  { label: "Live", href: "/admin/live", icon: Radio },
  { label: "Clientes", href: "/admin/clientes", icon: Contact },
  { label: "Comisiones", href: "/admin/comisiones", icon: CircleDollarSign },
  { label: "Contabilidad", href: "/admin/contabilidad", icon: ReceiptText },
  { label: "Configuración Comercial", href: "/admin/config-comercial", icon: SlidersHorizontal },
  { label: "Equipos", href: "/admin/equipos", icon: Smartphone },
  { label: "WhatsApp Web (QR)", href: "/admin/web-qr", icon: QrCode },
  { label: "Validación PCS", href: "/admin/pcs", icon: ListChecks },
  { label: "Plantillas", href: "/admin/plantillas", icon: FileText },
  { label: "Scripts", href: "/admin/scripts", icon: Mic },
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
