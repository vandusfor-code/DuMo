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
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";

export default function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useAdminDashboard();

  return (
    <div>
      <AdminPageHeader
        title="Dashboard Ejecutivo"
        subtitle="Resumen general del negocio"
      />

      {isError ? (
        <ErrorState
          title="No se pudo cargar el dashboard"
          message="Intenta nuevamente."
          onRetry={() => refetch()}
        />
      ) : isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 gap-6 xl:grid-cols-4"
        >
          {/* Columna principal */}
          <div className="space-y-6 xl:col-span-3">
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-4">
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

            {/* Meta mensual */}
            <MonthlyGoalCard goal={data.monthlyGoal} />
          </div>

          {/* Columna derecha */}
          <div className="space-y-6 xl:col-span-1">
            <AlertsCard alerts={data.alerts} />
            <RecentActivityCard activity={data.activity} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
      <div className="space-y-6 xl:col-span-3">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-card" />
      </div>
      <div className="space-y-6 xl:col-span-1">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    </div>
  );
}
