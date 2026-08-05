import "server-only";
import type {
  AdminCommissionDetail,
  AdminCommissionFilters,
  AdminCommissionResult,
  AdminCommissionStatus,
} from "@/types/admin-commission";
import { ADMIN_SALES_MOCK } from "@/data/mock/admin-sales.mock";
import { getAuthRepository } from "@/repositories/auth.repository";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import { withLatency } from "@/lib/mock";

export interface CommissionRepository {
  list(filters: AdminCommissionFilters): Promise<AdminCommissionResult>;
  getDetail(advisorId: string, filters: AdminCommissionFilters): Promise<AdminCommissionDetail>;
  markPaid(advisorId: string, filters: AdminCommissionFilters): Promise<void>;
}

function inPeriod(dateStr: string, filters: AdminCommissionFilters): boolean {
  const [, m, y] = dateStr.split("/");
  const month = filters.month.padStart(2, "0");
  const year = filters.year;
  return m === month && y === year;
}

class MockCommissionRepository implements CommissionRepository {
  private paidAdvisors = new Set<string>();

  async list(filters: AdminCommissionFilters): Promise<AdminCommissionResult> {
    const configRepo = getCommercialConfigurationRepository();
    const config = await configRepo.getSnapshot();
    const advisors = await getAuthRepository().listByRole("asesora");

    const rows = await Promise.all(
      advisors.map(async (advisor) => {
        const advisorSales = ADMIN_SALES_MOCK.filter(
          (s) => s.advisor === advisor.name && inPeriod(s.date, filters),
        );
        const finalized = advisorSales.filter((s) => s.status === "finalizada");
        let calculatedCommission = 0;
        for (const sale of finalized) {
          const perLine = await configRepo.resolveCommissionForPlan(sale.plan);
          calculatedCommission += perLine * sale.lines;
        }

        const status: AdminCommissionStatus = this.paidAdvisors.has(advisor.id)
          ? "paid"
          : "pending";

        return {
          id: advisor.id,
          name: advisor.name,
          avatarUrl: advisor.avatarUrl,
          registeredSales: advisorSales.length,
          finalizedSales: finalized.length,
          calculatedCommission,
          status,
          paymentDate: status === "paid" ? `${filters.year}-${filters.month.padStart(2, "0")}-05` : null,
        };
      }),
    );

    let filtered = rows;
    if (filters.advisor !== "all") {
      filtered = filtered.filter((r) => r.id === filters.advisor);
    }
    if (filters.status !== "all") {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    const pendingTotal = filtered
      .filter((r) => r.status === "pending")
      .reduce((s, r) => s + r.calculatedCommission, 0);
    const paidTotal = filtered
      .filter((r) => r.status === "paid")
      .reduce((s, r) => s + r.calculatedCommission, 0);
    const finalizedSales = filtered.reduce((s, r) => s + r.finalizedSales, 0);

    return withLatency({
      summary: {
        pendingTotal,
        paidTotal,
        finalizedSales,
        totalToPay: pendingTotal,
      },
      rows: filtered,
    });
  }

  async getDetail(advisorId: string, filters: AdminCommissionFilters): Promise<AdminCommissionDetail> {
    const configRepo = getCommercialConfigurationRepository();
    const list = await this.list({ ...filters, advisor: advisorId, status: "all" });
    const advisor = list.rows[0];
    if (!advisor) throw new Error("Asesora no encontrada");

    const sales = ADMIN_SALES_MOCK.filter(
      (s) =>
        s.advisor === advisor.name &&
        s.status === "finalizada" &&
        inPeriod(s.date, filters),
    );

    const saleDetails = await Promise.all(
      sales.map(async (s) => {
        const commission = (await configRepo.resolveCommissionForPlan(s.plan)) * s.lines;
        return {
          saleId: s.id,
          customerName: s.customerName,
          date: s.date,
          plan: s.plan,
          lines: s.lines,
          womValue: s.womValue,
          commission,
        };
      }),
    );

    return withLatency({
      advisor,
      sales: saleDetails,
      totalCommission: advisor.calculatedCommission,
      calculatedAt: `${filters.year}-${filters.month.padStart(2, "0")}-04T18:00:00`,
      paymentHistory:
        advisor.status === "paid"
          ? [
              {
                id: "pay-1",
                amount: advisor.calculatedCommission,
                date: advisor.paymentDate ?? "",
                note: "Pago quincenal",
              },
            ]
          : [],
    });
  }

  markPaid(advisorId: string, _filters: AdminCommissionFilters) {
    this.paidAdvisors.add(advisorId);
    return withLatency(undefined);
  }
}

import { getPostgresSalesStore } from "@/repositories/postgres-sales.repository";
import { hasDatabase } from "@/server/db/client";

export function getCommissionRepository(): CommissionRepository {
  if (hasDatabase()) {
    const store = getPostgresSalesStore();
    return {
      list: (filters) => store.listAdminCommissions(filters),
      getDetail: (advisorId, filters) => store.getCommissionDetail(advisorId, filters),
      markPaid: (advisorId, filters) => store.markCommissionPaid(advisorId, filters),
    };
  }
  return new MockCommissionRepository();
}
