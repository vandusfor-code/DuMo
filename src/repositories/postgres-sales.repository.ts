import "server-only";
import type {
  AdminCommissionDetail,
  AdminCommissionFilters,
  AdminCommissionResult,
  AdminCommissionStatus,
} from "@/types/admin-commission";
import {
  filterAdminSales,
  summarizeAdminSales,
} from "@/lib/admin-sales-filter";
import type {
  AdminSale,
  AdminSaleStatus,
  AdminSalesFilters,
  AdminSalesResult,
} from "@/types/admin-sale";
import type { AdminDashboardData } from "@/types/admin-dashboard";
import type { Commission } from "@/types/commission";
import type { DashboardData } from "@/types/dashboard";
import type { NewSaleInput, SaleDetail, SaleSummary } from "@/types/sale";
import { businessDateISO, businessMonth } from "@/lib/date";
import { formatCurrency } from "@/lib/format";
import type { AdvisorScope } from "@/lib/advisor-scope";
import { matchesAdvisor } from "@/lib/advisor-scope";
import { getAuthRepository } from "@/repositories/auth.repository";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import { buildPlanValueIndex, findCommercialPlanById } from "@/lib/commercial-plan";
import { findPlanCommission } from "@/data/mock/commercial-config.mock";
import {
  economicProgress,
  perAdvisorEconomicGoal,
  perAdvisorSalesGoal,
  resolveAdvisorSalesGoal,
  salesProgress,
} from "@/lib/commercial-settings";
import { ADMIN_DASHBOARD_MOCK } from "@/data/mock/admin-dashboard.mock";
import { ensureSchema, getSql, withDbRetry, withQueryTimeout } from "@/server/db/client";
import {
  adminDateInPeriod,
  adminTypeToCanonical,
  canonicalToAdminType,
  isoDateInMonth,
  toAdminDate,
  toAdminSaleType,
  toAdminTime,
  toAdvisorStatus,
  ADMIN_STATUS_LABELS,
  ADMIN_TYPE_LABELS,
} from "@/server/db/sales-mappers";

type SaleRow = {
  id: string;
  customer_name: string;
  rut: string;
  phone: string;
  email: string;
  advisor_id: string | null;
  advisor_name: string;
  status: string;
  sale_type: string;
  plan: string;
  operator_value: number | string;
  dumo_value?: number | string;
  sale_date: string | Date;
  notes: string;
  created_at: string | Date;
  line_count?: number | string;
};

type LineRow = {
  id: string;
  sale_id: string;
  phone_number: string;
  sale_type: string;
  device_name: string;
  plan_id: string;
  status: string;
};

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

function advisorDailyGoal(personalSalesGoal: number): number {
  if (personalSalesGoal <= 0) return 0;
  return Math.max(1, Math.round(personalSalesGoal / 20));
}

function buildAdvisorDashboardShell(
  personalSalesGoal: number,
  personalEconomicGoal: number,
  now = new Date(),
): DashboardData {
  const dailyGoal = advisorDailyGoal(personalSalesGoal);
  const dateFmt = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long" });
  const monthName = new Intl.DateTimeFormat("es-CL", { month: "long" }).format(now);
  const monthLabel = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${now.getFullYear()}`;

  return {
    dailySales: {
      count: 0,
      goal: dailyGoal,
      dateLabel: `Hoy, ${dateFmt.format(now)}`,
      series: DAILY_BUCKETS.map((b) => ({ label: b.label, value: 0 })),
    },
    monthlySales: {
      count: 0,
      goal: personalSalesGoal,
      monthLabel,
      series: MONTH_BUCKETS.map((d) => ({ label: String(d), value: 0 })),
    },
    economicTarget:
      personalEconomicGoal > 0
        ? { current: 0, goal: personalEconomicGoal, progress: 0 }
        : undefined,
    commission: { estimated: 0, generated: 0, paid: 0 },
    recentSales: [],
    quickSummary: {
      dailySales: 0,
      monthlySales: 0,
      newClients: 0,
      pending: 0,
    },
    monthlyProgress: 0,
  };
}

function isoFromRow(row: SaleRow): string {
  const d = row.sale_date;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function lineCount(row: SaleRow): number {
  return Number(row.line_count ?? 0) || 0;
}

function resolveSaleValues(
  row: SaleRow,
  planIndex: Map<string, { wom: number; dumo: number }>,
): { womValue: number; dumoValue: number } {
  const storedWom = Number(row.operator_value ?? 0) || 0;
  const storedDumo = Number(row.dumo_value ?? 0) || 0;
  const fromPlan = row.plan ? planIndex.get(row.plan.toLowerCase()) : undefined;
  return {
    womValue: storedWom || fromPlan?.wom || 0,
    dumoValue: storedDumo || fromPlan?.dumo || 0,
  };
}

function rowToAdminSale(
  row: SaleRow,
  planIndex: Map<string, { wom: number; dumo: number }>,
): AdminSale {
  const iso = isoFromRow(row);
  const { womValue, dumoValue } = resolveSaleValues(row, planIndex);
  return {
    id: row.id.startsWith("#") ? row.id : row.id,
    date: toAdminDate(iso),
    time: toAdminTime(row.created_at),
    customerName: row.customer_name,
    rut: row.rut,
    advisor: row.advisor_name,
    type: toAdminSaleType(row.sale_type),
    plan: row.plan,
    womValue,
    dumoValue,
    status: row.status as AdminSale["status"],
    lines: lineCount(row),
  };
}

async function loadPlanValueIndex() {
  const config = await getCommercialConfigurationRepository().getSnapshot();
  return buildPlanValueIndex(config.plans);
}

async function fetchSalesWithLineCounts(
  scope: AdvisorScope | null = null,
): Promise<SaleRow[]> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) return [];

  const runQuery = () => {
    if (scope?.id) {
      return sql<SaleRow[]>`
        SELECT s.*, COUNT(l.id)::int AS line_count
        FROM sales s
        LEFT JOIN sale_lines l ON l.sale_id = s.id
        WHERE s.advisor_id = ${scope.id}
        GROUP BY s.id
        ORDER BY s.sale_date DESC, s.created_at DESC
      `;
    }
    if (scope?.name) {
      return sql<SaleRow[]>`
        SELECT s.*, COUNT(l.id)::int AS line_count
        FROM sales s
        LEFT JOIN sale_lines l ON l.sale_id = s.id
        WHERE s.advisor_name = ${scope.name}
        GROUP BY s.id
        ORDER BY s.sale_date DESC, s.created_at DESC
      `;
    }
    return sql<SaleRow[]>`
      SELECT s.*, COUNT(l.id)::int AS line_count
      FROM sales s
      LEFT JOIN sale_lines l ON l.sale_id = s.id
      GROUP BY s.id
      ORDER BY s.sale_date DESC, s.created_at DESC
    `;
  };

  return withQueryTimeout(withDbRetry(runQuery), 8000);
}

function monthExpenseBounds(monthKey: string): { start: string; end: string } {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = `${monthKey}-01`;
  const end =
    month >= 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end };
}

export class PostgresSalesStore {
  async listSummaries(scope: AdvisorScope | null = null): Promise<SaleSummary[]> {
    try {
      const rows = await fetchSalesWithLineCounts(scope);
      return rows.map((row) => ({
        id: row.id,
        customerName: row.customer_name,
        rut: row.rut,
        date: isoFromRow(row),
        lines: lineCount(row),
        status: toAdvisorStatus(row.status),
      }));
    } catch (err) {
      console.error("[listSummaries]", err);
      return [];
    }
  }

  async getSaleDetail(id: string): Promise<SaleDetail | null> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return null;

    const rows = await withDbRetry(() =>
      sql<SaleRow[]>`
        SELECT s.*, COUNT(l.id)::int AS line_count
        FROM sales s
        LEFT JOIN sale_lines l ON l.sale_id = s.id
        WHERE s.id = ${id}
        GROUP BY s.id
        LIMIT 1
      `,
    );
    const row = rows[0];
    if (!row) return null;

    const lines = await withDbRetry(() =>
      sql<LineRow[]>`
        SELECT * FROM sale_lines WHERE sale_id = ${id} ORDER BY id
      `,
    );

    return {
      id: row.id,
      customer: {
        name: row.customer_name,
        rut: row.rut,
        phone: row.phone,
        email: row.email,
      },
      advisor: row.advisor_name,
      status: toAdvisorStatus(row.status),
      createdAt: isoFromRow(row),
      notes: row.notes ?? "",
      lines: lines.map((l) => ({
        phoneNumber: l.phone_number,
        saleType: adminTypeToCanonical(toAdminSaleType(l.sale_type)),
        deviceName: l.device_name || undefined,
        status: toAdvisorStatus(l.status),
      })),
      history: [
        {
          title: "Venta creada",
          user: row.advisor_name || "Sistema",
          datetime:
            row.created_at instanceof Date
              ? row.created_at.toISOString()
              : String(row.created_at),
        },
      ],
    };
  }

  async createSale(
    input: NewSaleInput,
    advisor: AdvisorScope | null = null,
  ): Promise<SaleDetail> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new Error("Base de datos no configurada");

    const advisorName = advisor?.name ?? "Asesora";
    const advisorId = advisor?.id ?? null;

    const year = new Date().getFullYear();
    const countRows = await withDbRetry(() => sql`SELECT count(*)::int AS n FROM sales`);
    const seq = (countRows[0]?.n ?? 0) + 1;
    const id = `VTA-${year}-${String(seq).padStart(5, "0")}`;
    const now = new Date();
    const today = businessDateISO(now);
    const config = await getCommercialConfigurationRepository().getSnapshot();
    const primaryLine = input.lines[0];
    const primaryType = primaryLine?.saleType ?? "portability";
    const adminType = canonicalToAdminType(primaryType);
    const primaryPlan = primaryLine?.planId
      ? findCommercialPlanById(primaryLine.planId, config.plans)
      : undefined;
    const planName = primaryPlan?.name ?? "";
    const operatorValue = primaryPlan?.womValue ?? 0;
    const dumoValue = primaryPlan?.dumoValue ?? 0;

    await withDbRetry(async () => {
      await sql`
        INSERT INTO sales (
          id, customer_name, rut, phone, email, advisor_id, advisor_name,
          status, sale_type, plan, operator_value, dumo_value, sale_date, notes, created_at
        ) VALUES (
          ${id}, ${input.customerName}, ${input.rut}, ${input.phone},
          ${input.email ?? ""}, ${advisorId}, ${advisorName}, ${"registrada"},
          ${adminType}, ${planName}, ${operatorValue}, ${dumoValue}, ${today},
          ${input.notes ?? ""}, ${now.toISOString()}
        )
      `;
      for (let i = 0; i < input.lines.length; i++) {
        const l = input.lines[i];
        const lineAdminType = canonicalToAdminType(l.saleType);
        const linePlanId = l.planId?.trim() ?? primaryLine?.planId?.trim() ?? "";
        await sql`
          INSERT INTO sale_lines (
            id, sale_id, phone_number, sale_type, device_name, plan_id, status
          ) VALUES (
            ${`${id}-L${i + 1}`}, ${id}, ${l.phoneNumber}, ${lineAdminType},
            ${l.deviceName ?? ""}, ${linePlanId}, ${"registrada"}
          )
        `;
      }
    });

    const detail = await this.getSaleDetail(id);
    if (!detail) throw new Error("No se pudo crear la venta");
    return detail;
  }

  async listAdminSales(filters: AdminSalesFilters): Promise<AdminSalesResult> {
    const planIndex = await loadPlanValueIndex();
    const rows = await fetchSalesWithLineCounts();
    const mapped = rows.map((r) => rowToAdminSale(r, planIndex));
    const filtered = filterAdminSales(mapped, filters);
    const summary = summarizeAdminSales(filtered);
    const start = (filters.page - 1) * filters.pageSize;
    return {
      rows: filtered.slice(start, start + filters.pageSize),
      total: filtered.length,
      summary,
    };
  }

  async updateSaleStatuses(ids: string[], status: AdminSaleStatus): Promise<void> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new Error("Base de datos no configurada");
    if (ids.length === 0) return;

    const normalized = [...new Set(ids.map((id) => id.replace(/^#/, "")))];
    await withDbRetry(async () => {
      for (const id of normalized) {
        await sql`UPDATE sales SET status = ${status} WHERE id = ${id}`;
        await sql`UPDATE sale_lines SET status = ${status} WHERE sale_id = ${id}`;
      }
    });
  }

  async deleteSales(ids: string[]): Promise<void> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new Error("Base de datos no configurada");
    if (ids.length === 0) return;

    const normalized = [...new Set(ids.map((id) => id.replace(/^#/, "")))];
    await withDbRetry(async () => {
      for (const id of normalized) {
        await sql`DELETE FROM sale_lines WHERE sale_id = ${id}`;
        await sql`DELETE FROM sales WHERE id = ${id}`;
      }
    });
  }

  /** Elimina una venta verificando que pertenezca a la asesora conectada. */
  async deleteSale(id: string, scope: AdvisorScope | null = null): Promise<void> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new Error("Base de datos no configurada");

    const normalized = id.replace(/^#/, "");
    const rows = await withDbRetry(() =>
      sql<SaleRow[]>`
        SELECT id, advisor_id, advisor_name FROM sales WHERE id = ${normalized} LIMIT 1
      `,
    );
    const row = rows[0];
    if (!row) throw new Error("Venta no encontrada.");

    if (scope && !matchesAdvisor(row, scope)) {
      throw new Error("No tienes permiso para eliminar esta venta.");
    }

    await this.deleteSales([normalized]);
  }

  async listAdminCommissions(filters: AdminCommissionFilters): Promise<AdminCommissionResult> {
    const configRepo = getCommercialConfigurationRepository();
    const config = await configRepo.getSnapshot();
    const planIndex = buildPlanValueIndex(config.plans);
    const advisors = await getAuthRepository().listByRole("asesora");
    const sales = (await fetchSalesWithLineCounts()).map((r) => rowToAdminSale(r, planIndex));
    const paidRows = await this.loadCommissionPayments(filters.month, filters.year);

    const rows = await Promise.all(
      advisors.map(async (advisor) => {
        const advisorSales = sales.filter(
          (s) => s.advisor === advisor.name && adminDateInPeriod(s.date, filters.month, filters.year),
        );
        const finalized = advisorSales.filter((s) => s.status === "finalizada");
        let calculatedCommission = 0;
        for (const sale of finalized) {
          const perLine = findPlanCommission(sale.plan, config.plans);
          calculatedCommission += perLine * sale.lines;
        }

        const paidRecord = paidRows.find((p) => p.advisor_id === advisor.id);
        const status: AdminCommissionStatus =
          paidRecord?.status === "paid" ? "paid" : "pending";

        return {
          id: advisor.id,
          name: advisor.name,
          avatarUrl: advisor.avatarUrl,
          registeredSales: advisorSales.length,
          finalizedSales: finalized.length,
          calculatedCommission,
          status,
          paymentDate:
            status === "paid" && paidRecord?.paid_at
              ? String(paidRecord.paid_at).slice(0, 10)
              : status === "paid"
                ? `${filters.year}-${filters.month.padStart(2, "0")}-05`
                : null,
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

    return {
      summary: {
        pendingTotal,
        paidTotal,
        finalizedSales,
        totalToPay: pendingTotal,
      },
      rows: filtered,
    };
  }

  async getCommissionDetail(
    advisorId: string,
    filters: AdminCommissionFilters,
  ): Promise<AdminCommissionDetail> {
    const configRepo = getCommercialConfigurationRepository();
    const list = await this.listAdminCommissions({ ...filters, advisor: advisorId, status: "all" });
    const advisor = list.rows[0];
    if (!advisor) throw new Error("Asesora no encontrada");

    const config = await configRepo.getSnapshot();
    const planIndex = buildPlanValueIndex(config.plans);
    const sales = (await fetchSalesWithLineCounts())
      .map((r) => rowToAdminSale(r, planIndex))
      .filter(
        (s) =>
          s.advisor === advisor.name &&
          s.status === "finalizada" &&
          adminDateInPeriod(s.date, filters.month, filters.year),
      );

    const saleDetails = sales.map((s) => {
      const commission = findPlanCommission(s.plan, config.plans) * s.lines;
      return {
        saleId: s.id,
        customerName: s.customerName,
        date: s.date,
        plan: s.plan,
        lines: s.lines,
        womValue: s.womValue,
        commission,
      };
    });

    return {
      advisor,
      sales: saleDetails,
      totalCommission: advisor.calculatedCommission,
      calculatedAt: `${filters.year}-${filters.month.padStart(2, "0")}-04T18:00:00`,
      paymentHistory:
        advisor.status === "paid"
          ? [
              {
                id: `pay-${advisorId}-${filters.year}${filters.month}`,
                amount: advisor.calculatedCommission,
                date: advisor.paymentDate ?? "",
                note: "Pago quincenal",
              },
            ]
          : [],
    };
  }

  async markCommissionPaid(advisorId: string, filters: AdminCommissionFilters): Promise<void> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new Error("Base de datos no configurada");

    const detail = await this.getCommissionDetail(advisorId, filters);
    const month = Number(filters.month);
    const year = Number(filters.year);
    const id = `CP-${advisorId}-${year}-${String(month).padStart(2, "0")}`;

    await withDbRetry(() =>
      sql`
        INSERT INTO commission_payments (
          id, advisor_id, period_month, period_year, amount, status, paid_at, note
        ) VALUES (
          ${id}, ${advisorId}, ${month}, ${year}, ${detail.totalCommission},
          ${"paid"}, ${new Date().toISOString()}, ${"Pago quincenal"}
        )
        ON CONFLICT (advisor_id, period_month, period_year)
        DO UPDATE SET
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          paid_at = EXCLUDED.paid_at
      `,
    );
  }

  private async loadCommissionPayments(month: string, year: string) {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return [];
    return withDbRetry(() =>
      sql<
        {
          advisor_id: string;
          status: string;
          paid_at: string | null;
        }[]
      >`
        SELECT advisor_id, status, paid_at
        FROM commission_payments
        WHERE period_month = ${Number(month)} AND period_year = ${Number(year)}
      `,
    );
  }

  async listAdvisorCommissions(
    month?: string,
    scope: AdvisorScope | null = null,
  ): Promise<Commission[]> {
    try {
      const configRepo = getCommercialConfigurationRepository();
      const config = await withQueryTimeout(configRepo.getSnapshot(), 6000);
      const plans = config.plans;

      const rows = await fetchSalesWithLineCounts(scope);
      const monthKey = month ?? businessMonth();
      const paidByAdvisorMonth = new Map<string, boolean>();

      const monthNum = Number(monthKey.slice(5, 7));
      const yearNum = Number(monthKey.slice(0, 4));
      const payments = await withQueryTimeout(
        this.loadCommissionPayments(String(monthNum), String(yearNum)),
        5000,
      );
      for (const p of payments) {
        if (p.status === "paid") {
          paidByAdvisorMonth.set(p.advisor_id, true);
        }
      }

      const commissions: Commission[] = [];
      for (const row of rows) {
        const iso = isoFromRow(row);
        if (!isoDateInMonth(iso, monthKey)) continue;
        const lines = lineCount(row);
        const perLine = findPlanCommission(row.plan ?? "", plans);
        const amount = perLine * lines;
        const paid = row.advisor_id ? paidByAdvisorMonth.get(row.advisor_id) : false;
        commissions.push({
          id: `COM-${row.id.replace(/^VTA-/, "")}`,
          saleId: row.id,
          customerName: row.customer_name,
          date: iso,
          lines,
          amount,
          status: paid ? "paid" : "pending",
          paymentDate: paid ? `${monthKey}-05` : null,
        });
      }

      return commissions.sort((a, b) => b.date.localeCompare(a.date));
    } catch (err) {
      console.error("[listAdvisorCommissions]", err);
      return [];
    }
  }

  async getAdvisorDashboard(scope: AdvisorScope | null = null): Promise<DashboardData> {
    const configRepo = getCommercialConfigurationRepository();
    let config;
    let advisors;
    try {
      [config, advisors] = await Promise.all([
        withQueryTimeout(configRepo.getSnapshot(), 8000),
        withQueryTimeout(getAuthRepository().listByRole("asesora"), 8000),
      ]);
    } catch (err) {
      console.error("[getAdvisorDashboard] config", err);
      return buildAdvisorDashboardShell(0, 0);
    }

    const activeAdvisorCount = advisors.filter((a) => a.active).length || 1;
    const advisorUser = scope ? advisors.find((a) => a.id === scope.id) : null;
    const personalSalesGoal = resolveAdvisorSalesGoal(
      advisorUser,
      config.settings.monthlyGoal,
      activeAdvisorCount,
    );
    const personalEconomicGoal = perAdvisorEconomicGoal(
      config.settings.economicGoal,
      activeAdvisorCount,
    );
    const dailyGoal = advisorDailyGoal(personalSalesGoal);

    try {
      const planIndex = buildPlanValueIndex(config.plans);
      const allRows = await fetchSalesWithLineCounts();
      const rows = allRows.filter((row) => matchesAdvisor(row, scope));

      const now = new Date();
      const todayIso = businessDateISO(now);
      const monthKey = businessMonth(now);

      const monthSales = rows.filter((r) => isoFromRow(r).startsWith(monthKey));
      const daySales = rows.filter((r) => isoFromRow(r) === todayIso);

      const dailySeries = DAILY_BUCKETS.map((b) => ({
        label: b.label,
        value: daySales.filter((v) => {
          const created =
            v.created_at instanceof Date ? v.created_at : new Date(String(v.created_at));
          return created.getHours() <= b.hour;
        }).length,
      }));

      const monthlySeries = MONTH_BUCKETS.map((day) => ({
        label: String(day),
        value: monthSales.filter((v) => {
          const d = Number(isoFromRow(v).slice(8, 10));
          return d > 0 && d <= day;
        }).length,
      }));

      const monthCommissions = await this.listAdvisorCommissions(monthKey, scope);
      const generated = monthCommissions.reduce((s, c) => s + c.amount, 0);
      const paid = monthCommissions
        .filter((c) => c.status === "paid")
        .reduce((s, c) => s + c.amount, 0);

      const monthDumoIncome = monthSales
        .filter((r) => r.status === "finalizada")
        .reduce((sum, r) => {
          const { dumoValue } = resolveSaleValues(r, planIndex);
          return sum + dumoValue * lineCount(r);
        }, 0);

      const recentSales = [...rows]
        .sort((a, b) => {
          const aT =
            a.created_at instanceof Date
              ? a.created_at.toISOString()
              : String(a.created_at);
          const bT =
            b.created_at instanceof Date
              ? b.created_at.toISOString()
              : String(b.created_at);
          return bT.localeCompare(aT);
        })
        .slice(0, 5)
        .map((v) => ({
          id: v.id,
          customerName: v.customer_name,
          rut: v.rut,
          date: isoFromRow(v),
          lines: lineCount(v),
          status: toAdvisorStatus(v.status),
          saleType: adminTypeToCanonical(toAdminSaleType(v.sale_type)),
          plan: v.plan ?? "",
        }));

      const pending = rows.filter((v) => toAdvisorStatus(v.status) === "pending").length;
      const newClients = new Set(monthSales.map((v) => v.rut)).size;
      const monthlyProgress = salesProgress(monthSales.length, personalSalesGoal);
      const economicProgressPct = economicProgress(monthDumoIncome, personalEconomicGoal);

      const dateFmt = new Intl.DateTimeFormat("es-CL", {
        day: "numeric",
        month: "long",
      });
      const monthName = new Intl.DateTimeFormat("es-CL", { month: "long" }).format(now);
      const monthLabel = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${now.getFullYear()}`;

      return {
        dailySales: {
          count: daySales.length,
          goal: dailyGoal,
          dateLabel: `Hoy, ${dateFmt.format(now)}`,
          series: dailySeries,
        },
        monthlySales: {
          count: monthSales.length,
          goal: personalSalesGoal,
          monthLabel,
          series: monthlySeries,
        },
        economicTarget: {
          current: monthDumoIncome,
          goal: personalEconomicGoal,
          progress: economicProgressPct,
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
    } catch (err) {
      console.error("[getAdvisorDashboard] sales", err);
      return buildAdvisorDashboardShell(personalSalesGoal, personalEconomicGoal);
    }
  }

  async getAdminDashboard(): Promise<AdminDashboardData> {
    try {
      const configRepo = getCommercialConfigurationRepository();
      const [config, rows] = await Promise.all([
        withQueryTimeout(configRepo.getSnapshot(), 8000),
        fetchSalesWithLineCounts(),
      ]);
      const planIndex = buildPlanValueIndex(config.plans);
      const adminSales = rows.map((r) => rowToAdminSale(r, planIndex));

      const todayIso = businessDateISO();
      const todayAdmin = toAdminDate(todayIso);
      const monthKey = businessMonth();

      const todaySales = adminSales.filter((s) => s.date === todayAdmin);
      const monthSales = adminSales.filter((s) => {
        const [, m, y] = s.date.split("/");
        return `${y}-${m}` === monthKey;
      });

      const finishedToday = todaySales.filter((s) => s.status === "finalizada").length;
      const inDelivery = monthSales.filter((s) => s.status === "en_reparto").length;
      const finalizedMonth = monthSales.filter((s) => s.status === "finalizada").length;
      const conversion =
        monthSales.length > 0
          ? Math.round((finalizedMonth / monthSales.length) * 1000) / 10
          : 0;

      const income = monthSales
        .filter((s) => s.status === "finalizada")
        .reduce((sum, s) => sum + s.dumoValue * s.lines, 0);

      const budget = config.settings.monthlyBudget || 0;
      let expenses = 0;
      const sql = getSql();
      if (sql) {
        const { start, end } = monthExpenseBounds(monthKey);
        try {
          const expenseRows = await withQueryTimeout(
            withDbRetry(() =>
              sql<{ amount: number | string }[]>`
                SELECT amount FROM accounting_expenses
                WHERE date >= ${start}::date AND date < ${end}::date
              `,
            ),
            5000,
          );
          expenses = expenseRows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        } catch (err) {
          console.error("[getAdminDashboard] expenses", err);
        }
      }

      const profit = income - expenses;
      const budgetLeft = budget - expenses;
      const monthlyGoal = config.settings.monthlyGoal || 0;
      const economicGoal = config.settings.economicGoal || 0;
      const salesProgressPct = salesProgress(monthSales.length, monthlyGoal);
      const economicProgressPct = economicProgress(income, economicGoal);

      const byAdvisor = new Map<string, number>();
      for (const s of monthSales) {
        byAdvisor.set(s.advisor, (byAdvisor.get(s.advisor) ?? 0) + 1);
      }

      const byType = new Map<string, number>();
      for (const s of monthSales) {
        byType.set(s.type, (byType.get(s.type) ?? 0) + 1);
      }

      const byStatus = new Map<string, number>();
      for (const s of monthSales) {
        byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
      }

      const salesByDay = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const label = d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric" });
        const adminD = toAdminDate(businessDateISO(d));
        return { label, value: adminSales.filter((s) => s.date === adminD).length };
      });

      const activity = adminSales.slice(0, 8).map((s) => ({
        time: s.time.replace(/\s/g, " ").slice(0, 8),
        person: s.advisor,
        action: `registró venta ${s.id}`,
      }));

      const alerts = [];
      if (monthlyGoal > 0 && salesProgressPct < 80) {
        alerts.push({
          kind: "goal" as const,
          message: `Meta de ventas al ${salesProgressPct}% — faltan ${Math.max(0, monthlyGoal - monthSales.length)} ventas.`,
          progress: salesProgressPct,
        });
      }
      if (economicGoal > 0 && economicProgressPct < 80) {
        alerts.push({
          kind: "goal" as const,
          message: `Meta económica al ${economicProgressPct}% — faltan ${formatCurrency(Math.max(0, economicGoal - income))}.`,
          progress: economicProgressPct,
        });
      }
      if (budget > 0 && expenses > budget * 0.85) {
        alerts.push({
          kind: "budget" as const,
          message: `Gastos al ${Math.round((expenses / budget) * 100)}% del presupuesto.`,
        });
      }
      if (inDelivery > 0) {
        alerts.push({
          kind: "delivery" as const,
          message: `${inDelivery} ventas en reparto pendientes de cierre.`,
        });
      }

      const kpi = (value: string, deltaLabel = "mes actual") => ({
        value,
        delta: 0,
        deltaLabel,
      });

      return {
        kpis: {
          salesToday: kpi(String(todaySales.length), "vs ayer"),
          finishedToday: kpi(String(finishedToday), "vs ayer"),
          inDelivery: kpi(String(inDelivery)),
          salesMonth: kpi(String(monthSales.length), "vs mes anterior"),
          conversion: kpi(`${conversion}%`),
          profit: kpi(formatCurrency(profit)),
          expenses: kpi(formatCurrency(expenses)),
          budgetLeft: kpi(formatCurrency(budgetLeft)),
        },
        salesByAdvisor: [...byAdvisor.entries()]
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value),
        salesByDay,
        salesByType: [...byType.entries()].map(([key, value]) => ({
          label: ADMIN_TYPE_LABELS[key as keyof typeof ADMIN_TYPE_LABELS] ?? key,
          value,
        })),
        salesByStatus: [...byStatus.entries()].map(([key, value]) => ({
          label: ADMIN_STATUS_LABELS[key as keyof typeof ADMIN_STATUS_LABELS] ?? key,
          value,
        })),
        alerts,
        activity,
        monthlyGoal: {
          goal: monthlyGoal,
          current: monthSales.length,
          progress: salesProgressPct,
          remaining: Math.max(0, monthlyGoal - monthSales.length),
          salesNeeded: Math.max(0, monthlyGoal - monthSales.length),
        },
        economicGoal: {
          goal: economicGoal,
          current: income,
          progress: economicProgressPct,
          remaining: Math.max(0, economicGoal - income),
        },
      };
    } catch (err) {
      console.error("[getAdminDashboard]", err);
      return { ...ADMIN_DASHBOARD_MOCK };
    }
  }

  async getMonthCommercialStats(monthKey: string): Promise<{
    salesCount: number;
    dumoIncome: number;
  }> {
    const configRepo = getCommercialConfigurationRepository();
    const config = await configRepo.getSnapshot();
    const planIndex = buildPlanValueIndex(config.plans);
    const rows = await fetchSalesWithLineCounts();
    const monthRows = rows.filter((r) => isoFromRow(r).startsWith(monthKey));
    const finalized = monthRows.filter((r) => r.status === "finalizada");
    const dumoIncome = finalized.reduce((sum, r) => {
      const { dumoValue } = resolveSaleValues(r, planIndex);
      return sum + dumoValue * lineCount(r);
    }, 0);
    return { salesCount: monthRows.length, dumoIncome };
  }
}

let store: PostgresSalesStore | null = null;

export function getPostgresSalesStore(): PostgresSalesStore {
  if (!store) store = new PostgresSalesStore();
  return store;
}
