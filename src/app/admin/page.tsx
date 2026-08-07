"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  DollarSign,
  LineChart,
  Percent,
  PieChart,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { ChartCard } from "@/components/admin/chart-card";
import {
  AdvisorBarChart,
  DailyLineChart,
  HorizontalBarChart,
} from "@/components/admin/admin-charts";
import { AlertsCard } from "@/components/admin/alerts-card";
import { RecentActivityCard } from "@/components/admin/recent-activity-card";
import { MonthlyGoalCard } from "@/components/admin/monthly-goal-card";
import { EconomicGoalCard } from "@/components/admin/economic-goal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryStaleBanner, shouldShowFatalQueryError } from "@/components/shared/query-state";
import { ErrorState } from "@/components/shared/error-state";
import { ADMIN_DASHBOARD_MOCK } from "@/data/mock/admin-dashboard.mock";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";

function EmptyDashboardFallback() {
  const empty = ADMIN_DASHBOARD_MOCK;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-card border border-line bg-card p-8 text-center"
    >
      <p className="text-[15px] font-medium text-ink">Sin datos de ventas aún</p>
      <p className="mt-2 text-[14px] text-muted">
        El dashboard mostrará KPIs cuando registres ventas en el sistema.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.values(empty.kpis).slice(0, 4).map((kpi, i) => (
          <div key={i} className="rounded-xl bg-canvas px-4 py-3">
            <p className="text-[12px] text-muted">KPI</p>
            <p className="text-[18px] font-bold text-ink">{kpi.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function AdminDashboardPage() {
  const query = useAdminDashboard();
  const { data, isLoading, isError, refetch } = query;
  const fatal = shouldShowFatalQueryError(query);

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Resumen general del negocio"
      />

      {fatal ? (
        <ErrorState
          title="No se pudo cargar el dashboard"
          message="Intenta nuevamente."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <QueryStaleBanner visible={isError && !!data} onRetry={() => refetch()} />
          {isLoading && !data ? (
        <DashboardSkeleton />
          ) : data ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 gap-4 xl:grid-cols-4"
        >
          {/* Columna principal */}
          <div className="space-y-4 xl:col-span-3">
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminKpiCard icon={<ShoppingBag />} iconClass="bg-brand-soft text-brand" label="Ventas registradas hoy" kpi={data.kpis.salesToday} />
              <AdminKpiCard icon={<CheckCircle2 />} iconClass="bg-success-soft text-success-ink" label="Ventas finalizadas hoy" kpi={data.kpis.finishedToday} />
              <AdminKpiCard icon={<Truck />} iconClass="bg-warning-soft text-warning-ink" label="Ventas en reparto" kpi={data.kpis.inDelivery} />
              <AdminKpiCard icon={<LineChart />} iconClass="bg-[#efe9fd] text-[#7c3aed]" label="Ventas del mes" kpi={data.kpis.salesMonth} />
              <AdminKpiCard icon={<Percent />} iconClass="bg-[#e8f0fe] text-[#2563eb]" label="Conversión (%)" kpi={data.kpis.conversion} />
              <AdminKpiCard icon={<DollarSign />} iconClass="bg-success-soft text-success-ink" label="Utilidad estimada" kpi={data.kpis.profit} />
              <AdminKpiCard icon={<Wallet />} iconClass="bg-danger-soft text-danger-ink" label="Gastos del mes" kpi={data.kpis.expenses} />
              <AdminKpiCard icon={<PieChart />} iconClass="bg-warning-soft text-warning-ink" label="Presupuesto restante" kpi={data.kpis.budgetLeft} />
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              <ChartCard title="Ventas por asesora">
                <AdvisorBarChart data={data.salesByAdvisor} />
              </ChartCard>
              <ChartCard title="Ventas por día" hint="(últimos 7 días)">
                <DailyLineChart data={data.salesByDay} />
              </ChartCard>
              <ChartCard title="Ventas por tipo de venta">
                <HorizontalBarChart data={data.salesByType} />
              </ChartCard>
              <ChartCard title="Ventas por estado">
                <HorizontalBarChart data={data.salesByStatus} />
              </ChartCard>
            </div>

            {/* Metas del mes */}
            <div className="space-y-4 pb-2">
              <MonthlyGoalCard goal={data.monthlyGoal} />
              <EconomicGoalCard goal={data.economicGoal} />
            </div>
          </div>

          {/* Columna derecha */}
          <div className="space-y-4 xl:col-span-1">
            <AlertsCard alerts={data.alerts} />
            <RecentActivityCard activity={data.activity} />
          </div>
        </motion.div>
          ) : (
            <EmptyDashboardFallback />
          )}
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
      <div className="space-y-4 xl:col-span-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[212px] rounded-card" />
          ))}
        </div>
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
      </div>
      <div className="space-y-4 xl:col-span-1">
        <Skeleton className="h-56 rounded-card" />
        <Skeleton className="h-56 rounded-card" />
      </div>
    </div>
  );
}
