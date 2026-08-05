import "server-only";
import type { DashboardData } from "@/types/dashboard";
import type { RecentSale } from "@/types/sale";
import { DASHBOARD_MOCK } from "@/data/mock/dashboard.mock";
import { withLatency } from "@/lib/mock";
import { businessDateISO, businessMonth } from "@/lib/date";
import { CONFIG_KEYS } from "@/server/google/schema";
import { toInt, toSaleStatus, toSaleType } from "@/server/google/parse";
import { getSheetsClient, type GoogleSheetsClient } from "@/server/google/sheets-client";

export interface DashboardRepository {
  getDashboard(): Promise<DashboardData>;
}

/* ----------------------------- Mock ----------------------------- */

class MockDashboardRepository implements DashboardRepository {
  getDashboard() {
    return withLatency(DASHBOARD_MOCK);
  }
}

/* --------------------------- Sheets ----------------------------- */

const DAILY_BUCKETS = [
  { label: "8 AM", hour: 8 },
  { label: "10 AM", hour: 10 },
  { label: "12 PM", hour: 12 },
  { label: "2 PM", hour: 14 },
  { label: "4 PM", hour: 16 },
  { label: "6 PM", hour: 18 },
  { label: "8 PM", hour: 20 },
];

const MONTH_BUCKETS = [1, 7, 14, 21, 28, 31];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

class SheetsDashboardRepository implements DashboardRepository {
  constructor(private readonly client: GoogleSheetsClient) {}

  async getDashboard(): Promise<DashboardData> {
    const [ventas, lineas, comisiones, config] = await Promise.all([
      this.client.getRecords("Ventas"),
      this.client.getRecords("LineasVenta"),
      this.client.getRecords("Comisiones"),
      this.client.getConfigMap(),
    ]);

    // Join helpers: line count and the first line's type, per sale.
    const lineCount = new Map<string, number>();
    const firstType = new Map<string, string>();
    for (const l of lineas) {
      lineCount.set(l.ventaId, (lineCount.get(l.ventaId) ?? 0) + 1);
      if (!firstType.has(l.ventaId)) firstType.set(l.ventaId, l.tipoVenta);
    }

    const now = new Date();
    const todayIso = businessDateISO(now);
    const monthKey = businessMonth(now); // yyyy-mm

    const monthSales = ventas.filter((v) => (v.fecha ?? "").startsWith(monthKey));
    const daySales = ventas.filter((v) => v.fecha === todayIso);

    // KPIs
    const dailyGoal = toInt(config[CONFIG_KEYS.dailyGoal]) || 15;
    const monthlyGoal = toInt(config[CONFIG_KEYS.monthlyGoal]) || 300;

    // Daily series — cumulative by 2h bucket using creadoEn hour.
    const dailySeries = DAILY_BUCKETS.map((b) => ({
      label: b.label,
      value: daySales.filter((v) => {
        const h = v.creadoEn ? new Date(v.creadoEn).getHours() : 0;
        return h <= b.hour;
      }).length,
    }));

    // Monthly series — cumulative by day threshold.
    const monthlySeries = MONTH_BUCKETS.map((day) => ({
      label: String(day),
      value: monthSales.filter((v) => {
        const d = toInt((v.fecha ?? "").slice(8, 10));
        return d > 0 && d <= day;
      }).length,
    }));

    // Commissions (month)
    const monthCommissions = comisiones.filter((c) =>
      (c.fecha ?? "").startsWith(monthKey),
    );
    const generated = monthCommissions.reduce((s, c) => s + toInt(c.monto), 0);
    const paid = monthCommissions
      .filter((c) => (c.estado ?? "").toLowerCase() === "paid")
      .reduce((s, c) => s + toInt(c.monto), 0);

    // Recent sales (latest 5 by date)
    const recentSales: RecentSale[] = [...ventas]
      .sort((a, b) =>
        (b.creadoEn || b.fecha || "").localeCompare(a.creadoEn || a.fecha || ""),
      )
      .slice(0, 5)
      .map((v) => ({
        id: v.id,
        customerName: v.cliente,
        rut: v.rut,
        date: v.fecha,
        lines: lineCount.get(v.id) ?? 0,
        status: toSaleStatus(v.estado),
        saleType: toSaleType(firstType.get(v.id)),
        plan: v.plan ?? "",
      }));

    const pending = ventas.filter(
      (v) => toSaleStatus(v.estado) === "pending",
    ).length;
    const newClients = new Set(monthSales.map((v) => v.rut)).size;

    const monthlyProgress = monthlyGoal
      ? Math.round((monthSales.length / monthlyGoal) * 100)
      : 0;

    const dateFmt = new Intl.DateTimeFormat("es-CL", {
      day: "numeric",
      month: "long",
    });
    const monthName = new Intl.DateTimeFormat("es-CL", {
      month: "long",
    }).format(now);
    const monthLabel = `${capitalize(monthName)} ${now.getFullYear()}`;

    return {
      dailySales: {
        count: daySales.length,
        goal: dailyGoal,
        dateLabel: `Hoy, ${dateFmt.format(now)}`,
        series: dailySeries,
      },
      monthlySales: {
        count: monthSales.length,
        goal: monthlyGoal,
        monthLabel,
        series: monthlySeries,
      },
      commission: {
        estimated: generated,
        generated,
        paid,
      },
      recentSales,
      quickSummary: {
        dailySales: daySales.length,
        monthlySales: monthSales.length,
        newClients,
        pending,
      },
      monthlyProgress,
    };
  }
}

import { getPostgresSalesStore } from "@/repositories/postgres-sales.repository";
import { hasDatabase } from "@/server/db/client";

export function getDashboardRepository(): DashboardRepository {
  if (hasDatabase()) {
    const store = getPostgresSalesStore();
    return { getDashboard: () => store.getAdvisorDashboard() };
  }
  return new MockDashboardRepository();
}
