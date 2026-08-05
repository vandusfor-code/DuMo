import type { LucideIcon } from "lucide-react";
import { CalendarClock, LineChart, Shield, Users } from "lucide-react";

export const LOGIN_COLORS = {
  background: "#FAFAFC",
  card: "#FFFFFF",
  primary: "#6D28FF",
  primaryHover: "#5B21E6",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#ECECF4",
  inputBorder: "#E8E8F0",
  cardShadow: "0 20px 60px rgba(109,40,255,0.10)",
  buttonShadow: "0 18px 40px rgba(109,40,255,0.25)",
} as const;

export type LoginFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const LOGIN_FEATURES: LoginFeature[] = [
  {
    icon: Users,
    title: "Gestión de Leads",
    description:
      "Centraliza y administra todos los prospectos comerciales desde una única plataforma.",
  },
  {
    icon: LineChart,
    title: "Control de Ventas",
    description:
      "Visualiza el estado de cada venta y el cumplimiento de los objetivos comerciales.",
  },
  {
    icon: CalendarClock,
    title: "Seguimiento Comercial",
    description:
      "Da continuidad a cada oportunidad y consulta el historial completo de cada cliente.",
  },
  {
    icon: Shield,
    title: "Información Segura",
    description:
      "Accede a una plataforma protegida con altos estándares de seguridad y control de acceso.",
  },
];

export const HERO_DESCRIPTION =
  "DuMo centraliza la gestión comercial de la organización en un solo lugar, facilitando el seguimiento de oportunidades, el control operativo y la administración de clientes durante todo el proceso comercial.";
