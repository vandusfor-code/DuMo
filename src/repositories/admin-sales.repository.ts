import "server-only";
import type {
  AdminSale,
  AdminSalesFilters,
  AdminSalesResult,
  AdminSalesSummary,
} from "@/types/admin-sale";
import { ADMIN_SALES_MOCK } from "@/data/mock/admin-sales.mock";
import { withLatency } from "@/lib/mock";

export interface AdminSalesRepository {
  list(filters: AdminSalesFilters): Promise<AdminSalesResult>;
}

function summarize(rows: AdminSale[]): AdminSalesSummary {
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

class MockAdminSalesRepository implements AdminSalesRepository {
  list(filters: AdminSalesFilters): Promise<AdminSalesResult> {
    const q = filters.search.trim().toLowerCase();
    const filtered = ADMIN_SALES_MOCK.filter((r) => {
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.advisor !== "all" && r.advisor !== filters.advisor) return false;
      if (filters.type !== "all" && r.type !== filters.type) return false;
      if (
        q &&
        !(
          r.customerName.toLowerCase().includes(q) ||
          r.rut.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.plan.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });

    const summary = summarize(filtered);
    const start = (filters.page - 1) * filters.pageSize;
    const rows = filtered.slice(start, start + filters.pageSize);
    return withLatency({ rows, total: filtered.length, summary });
  }
}

import { getPostgresSalesStore } from "@/repositories/postgres-sales.repository";
import { hasDatabase } from "@/server/db/client";

/** Fábrica — Supabase/Postgres cuando DATABASE_URL está configurada. */
export function getAdminSalesRepository(): AdminSalesRepository {
  if (hasDatabase()) {
    const store = getPostgresSalesStore();
    return { list: (filters) => store.listAdminSales(filters) };
  }
  return new MockAdminSalesRepository();
}
