import type { AdminSale, AdminSalesFilters, AdminSalesSummary } from "@/types/admin-sale";

export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/[.\-\s]/g, "");
}

export function parseAdminDisplayDate(date: string): string {
  const parts = date.split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function matchesAdminSaleSearch(row: AdminSale, rawSearch: string): boolean {
  const q = normalizeSearch(rawSearch);
  if (!q) return true;
  return (
    normalizeSearch(row.customerName).includes(q) ||
    normalizeSearch(row.rut).includes(q) ||
    normalizeSearch(row.id).includes(q) ||
    normalizeSearch(row.plan).includes(q)
  );
}

export function matchesAdminSaleDateRange(row: AdminSale, from?: string, to?: string): boolean {
  const iso = parseAdminDisplayDate(row.date);
  if (!iso) return true;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

export function filterAdminSales(rows: AdminSale[], filters: AdminSalesFilters): AdminSale[] {
  return rows.filter((r) => {
    if (filters.status !== "all" && r.status !== filters.status) return false;
    if (filters.advisor !== "all" && r.advisor !== filters.advisor) return false;
    if (filters.type !== "all" && r.type !== filters.type) return false;
    if (!matchesAdminSaleSearch(r, filters.search)) return false;
    if (!matchesAdminSaleDateRange(r, filters.dateFrom, filters.dateTo)) return false;
    return true;
  });
}

export function summarizeAdminSales(rows: AdminSale[]): AdminSalesSummary {
  const s: AdminSalesSummary = {
    total: rows.length,
    registrada: 0,
    en_reparto: 0,
    finalizada: 0,
    rechazada: 0,
    cancelada: 0,
  };
  for (const r of rows) s[r.status] += 1;
  return s;
}
