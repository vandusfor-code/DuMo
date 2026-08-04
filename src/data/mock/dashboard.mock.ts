import type { DashboardData } from "@/types/dashboard";

/**
 * Mock dashboard payload. Values mirror the reference mockup exactly.
 * Replace this module (via the repository) with a Google Sheets source later.
 */
export const DASHBOARD_MOCK: DashboardData = {
  dailySales: {
    count: 8,
    goal: 15,
    dateLabel: "Hoy, 3 de agosto",
    series: [
      { label: "8 AM", value: 2 },
      { label: "10 AM", value: 5 },
      { label: "12 PM", value: 9 },
      { label: "2 PM", value: 12 },
      { label: "4 PM", value: 11 },
      { label: "6 PM", value: 13 },
      { label: "8 PM", value: 18 },
    ],
  },
  monthlySales: {
    count: 127,
    goal: 300,
    monthLabel: "Agosto 2025",
    series: [
      { label: "1", value: 20 },
      { label: "7", value: 55 },
      { label: "14", value: 95 },
      { label: "21", value: 120 },
      { label: "28", value: 150 },
      { label: "31", value: 170 },
    ],
  },
  commission: {
    estimated: 1_840_000,
    generated: 1_840_000,
    paid: 920_000,
  },
  recentSales: [
    {
      id: "VTA-2025-00024",
      customerName: "Juan Sebastián Pérez",
      rut: "10.123.456-7",
      saleType: "portability_device",
      lines: 2,
      plan: "WOM 50 GB",
      date: "2025-08-03",
      status: "completed",
    },
    {
      id: "VTA-2025-00025",
      customerName: "Laura Andrea Gómez",
      rut: "1.032.456.789-0",
      saleType: "new_line",
      lines: 1,
      plan: "WOM Libre",
      date: "2025-08-03",
      status: "completed",
    },
    {
      id: "VTA-2025-00026",
      customerName: "Carlos Felipe Ramírez",
      rut: "8.765.432-1",
      saleType: "device_renewal",
      lines: 1,
      plan: "WOM Control 30 GB",
      date: "2025-08-02",
      status: "pending",
    },
    {
      id: "VTA-2025-00023",
      customerName: "María Paula Torres",
      rut: "1.098.765.432-1",
      saleType: "portability",
      lines: 1,
      plan: "WOM 25 GB",
      date: "2025-08-02",
      status: "completed",
    },
    {
      id: "VTA-2025-00022",
      customerName: "Daniel Camilo Ruiz",
      rut: "1.012.345.678-9",
      saleType: "migration",
      lines: 2,
      plan: "WOM Libre",
      date: "2025-08-01",
      status: "completed",
    },
  ],
  quickSummary: {
    dailySales: 8,
    monthlySales: 127,
    newClients: 5,
    pending: 12,
  },
  monthlyProgress: 42,
};
