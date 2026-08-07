import "server-only";
import type {
  AdminSale,
  AdminSaleStatus,
  AdminSalesFilters,
  AdminSalesResult,
} from "@/types/admin-sale";
import type { SaleDetail } from "@/types/sale";
import { ADMIN_SALES_MOCK } from "@/data/mock/admin-sales.mock";
import { filterAdminSales, parseAdminDisplayDate, summarizeAdminSales } from "@/lib/admin-sales-filter";
import { toAdvisorStatus, adminTypeToCanonical } from "@/server/db/sales-mappers";
import { withLatency } from "@/lib/mock";

export interface AdminSalesRepository {
  list(filters: AdminSalesFilters): Promise<AdminSalesResult>;
  getById(id: string): Promise<SaleDetail | null>;
  updateStatuses(ids: string[], status: AdminSaleStatus): Promise<void>;
  deleteSales(ids: string[]): Promise<void>;
}

class MockAdminSalesRepository implements AdminSalesRepository {
  private rows = [...ADMIN_SALES_MOCK];

  list(filters: AdminSalesFilters): Promise<AdminSalesResult> {
    const filtered = filterAdminSales(this.rows, filters);
    const summary = summarizeAdminSales(filtered);
    const start = (filters.page - 1) * filters.pageSize;
    return withLatency({
      rows: filtered.slice(start, start + filters.pageSize),
      total: filtered.length,
      summary,
    });
  }

  getById(id: string): Promise<SaleDetail | null> {
    const row = this.rows.find((r) => r.id === id || r.id.replace("#", "") === id);
    if (!row) return withLatency(null);
    return withLatency(mockSaleDetail(row));
  }

  updateStatuses(ids: string[], status: AdminSaleStatus): Promise<void> {
    const keys = new Set(ids.map((id) => id.replace("#", "")));
    this.rows = this.rows.map((r) =>
      keys.has(r.id.replace("#", "")) ? { ...r, status } : r,
    );
    return withLatency(undefined);
  }

  deleteSales(ids: string[]): Promise<void> {
    const keys = new Set(ids.map((id) => id.replace("#", "")));
    this.rows = this.rows.filter((r) => !keys.has(r.id.replace("#", "")));
    return withLatency(undefined);
  }
}

function mockSaleDetail(row: AdminSale): SaleDetail {
  return {
    id: row.id.replace("#", ""),
    customer: {
      name: row.customerName,
      rut: row.rut,
      phone: "",
      email: "",
    },
    advisor: row.advisor,
    status: toAdvisorStatus(row.status),
    createdAt: parseAdminDisplayDate(row.date) || row.date,
    notes: "",
    lines: Array.from({ length: row.lines }, (_, i) => ({
      phoneNumber: `569000000${i}`,
      saleType: adminTypeToCanonical(row.type),
      status: toAdvisorStatus(row.status),
    })),
    history: [{ title: "Venta registrada", user: row.advisor, datetime: new Date().toISOString() }],
  };
}

import { getPostgresSalesStore } from "@/repositories/postgres-sales.repository";
import { hasDatabase } from "@/server/db/client";

export function getAdminSalesRepository(): AdminSalesRepository {
  if (hasDatabase()) {
    const store = getPostgresSalesStore();
    return {
      list: (filters) => store.listAdminSales(filters),
      getById: (id) => store.getSaleDetail(id),
      updateStatuses: (ids, status) => store.updateSaleStatuses(ids, status),
      deleteSales: (ids) => store.deleteSales(ids),
    };
  }
  return new MockAdminSalesRepository();
}
