import type { AdminDashboardData } from "@/types/admin-dashboard";

/** Datos del Dashboard Ejecutivo (admin). Valores exactos del mockup. */
export const ADMIN_DASHBOARD_MOCK: AdminDashboardData = {
  kpis: {
    salesToday: { value: "48", delta: 12, deltaLabel: "vs ayer" },
    finishedToday: { value: "32", delta: 18, deltaLabel: "vs ayer" },
    inDelivery: { value: "16", delta: -3, deltaLabel: "vs ayer" },
    salesMonth: { value: "382", delta: 15, deltaLabel: "vs mes anterior" },
    conversion: { value: "34.2%", delta: 6.3, deltaLabel: "vs mes anterior" },
    profit: { value: "$12.850.000", delta: 22, deltaLabel: "vs mes anterior" },
    expenses: { value: "$8.750.000", delta: 8, deltaLabel: "vs mes anterior" },
    budgetLeft: { value: "$6.250.000", delta: 41, deltaLabel: "disponible" },
  },
  salesByAdvisor: [
    { label: "María", value: 68 },
    { label: "Laura", value: 56 },
    { label: "Andrea", value: 48 },
    { label: "Carolina", value: 42 },
    { label: "Paula", value: 38 },
    { label: "Sofía", value: 30 },
  ],
  salesByDay: [
    { label: "28 Jul", value: 28 },
    { label: "29 Jul", value: 32 },
    { label: "30 Jul", value: 35 },
    { label: "31 Jul", value: 41 },
    { label: "01 Ago", value: 36 },
    { label: "02 Ago", value: 38 },
    { label: "03 Ago", value: 48 },
  ],
  salesByType: [
    { label: "Portabilidad", value: 186 },
    { label: "Renovación", value: 98 },
    { label: "Línea Nueva", value: 62 },
    { label: "Migración", value: 28 },
    { label: "Otro", value: 8 },
  ],
  salesByStatus: [
    { label: "Finalizadas", value: 232 },
    { label: "En reparto", value: 16 },
    { label: "Registradas", value: 48 },
    { label: "Rechazadas", value: 6 },
    { label: "Canceladas", value: 5 },
  ],
  alerts: [
    {
      kind: "goal",
      message:
        "Te faltan 85 ventas finalizadas para cumplir la meta mensual de utilidad.",
      progress: 72,
    },
    {
      kind: "budget",
      message: "El gasto en Publicidad ya alcanzó el 78% del presupuesto mensual.",
    },
    {
      kind: "delivery",
      message: "3 ventas en reparto llevan más de 48 horas pendientes.",
    },
  ],
  activity: [
    { time: "10:24", person: "María López", action: "registró una venta" },
    { time: "10:18", person: "Laura Torres", action: "finalizó una venta" },
    { time: "10:05", person: "Andrea Ruiz", action: "cambió el estado de una venta" },
    { time: "09:52", person: "Carolina Díaz", action: "registró una venta" },
    { time: "09:31", person: "Paula Gómez", action: "finalizó una venta" },
  ],
  monthlyGoal: {
    goal: 10_000_000,
    current: 8_650_000,
    progress: 86.5,
    remaining: 1_350_000,
    salesNeeded: 85,
  },
};
