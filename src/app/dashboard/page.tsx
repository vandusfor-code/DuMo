"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SalesTrendCard } from "@/components/dashboard/sales-trend-card";
import { CommissionCard } from "@/components/dashboard/commission-card";
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table";
import { QuickSummaryCard } from "@/components/dashboard/quick-summary-card";
import { MonthlyProgressCard } from "@/components/dashboard/monthly-progress-card";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDashboard } from "@/hooks/use-dashboard";

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError, refetch } = useDashboard();
  const firstName = user?.name?.split(" ")[0] ?? "Asesora";

  return (
    <div className="space-y-8 pt-1">
      <PageHeader
        title={<span>👋 ¡Bienvenida, {firstName}!</span>}
        subtitle="Aquí tienes un resumen de tu actividad comercial."
        actions={
          <Button
            asChild
            size="lg"
            className="h-14 rounded-2xl px-6 text-[15px]"
          >
            <Link href="/dashboard/nueva-venta">
              <Plus className="size-5" />
              Nueva Venta
            </Link>
          </Button>
        }
      />

      {isError && !data ? (
        <ErrorState
          title="No se pudo cargar el dashboard"
          message="Intenta nuevamente en unos segundos."
          onRetry={() => refetch()}
        />
      ) : isLoading && !data ? (
        <DashboardSkeleton />
      ) : data ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SalesTrendCard
              title="Ventas del día"
              dateLabel={data.dailySales.dateLabel}
              count={data.dailySales.count}
              goal={data.dailySales.goal}
              series={data.dailySales.series}
              yTicks={[5, 10, 15, 20]}
              gradientId="dailyGradient"
            />
            <SalesTrendCard
              title="Ventas del mes"
              dateLabel={data.monthlySales.monthLabel}
              count={data.monthlySales.count}
              goal={data.monthlySales.goal}
              series={data.monthlySales.series}
              yTicks={[75, 150, 225, 300]}
              gradientId="monthlyGradient"
            />
            <CommissionCard
              estimated={data.commission.estimated}
              generated={data.commission.generated}
              paid={data.commission.paid}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentSalesTable sales={data.recentSales} />
            </div>
            <div className="space-y-6">
              <QuickSummaryCard summary={data.quickSummary} />
              <MonthlyProgressCard progress={data.monthlyProgress} />
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
