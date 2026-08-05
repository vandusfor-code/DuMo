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
import { EMPTY_ADVISOR_DASHBOARD } from "@/data/advisor-fallbacks";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDashboard } from "@/hooks/use-dashboard";

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data, isLoading, isFetching } = useDashboard();
  const firstName = user?.name?.split(" ")[0] ?? "Asesora";
  const dashboard = data ?? EMPTY_ADVISOR_DASHBOARD;
  const showSkeleton = isLoading && isFetching && !data;

  return (
    <div className="space-y-8 pt-1">
      <PageHeader
        title={`¡Bienvenida, ${firstName}!`}
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

      {showSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SalesTrendCard
              title="Ventas del día"
              dateLabel={dashboard.dailySales.dateLabel}
              count={dashboard.dailySales.count}
              goal={dashboard.dailySales.goal}
              series={dashboard.dailySales.series}
              yTicks={[5, 10, 15, 20]}
              gradientId="dailyGradient"
            />
            <SalesTrendCard
              title="Ventas del mes"
              dateLabel={dashboard.monthlySales.monthLabel}
              count={dashboard.monthlySales.count}
              goal={dashboard.monthlySales.goal}
              series={dashboard.monthlySales.series}
              yTicks={[75, 150, 225, 300]}
              gradientId="monthlyGradient"
            />
            <CommissionCard
              estimated={dashboard.commission.estimated}
              generated={dashboard.commission.generated}
              paid={dashboard.commission.paid}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentSalesTable sales={dashboard.recentSales} />
            </div>
            <div className="space-y-6">
              <QuickSummaryCard
                summary={dashboard.quickSummary}
                monthlyGoal={dashboard.monthlySales.goal}
              />
              <MonthlyProgressCard
                progress={dashboard.monthlyProgress}
                economicProgress={dashboard.economicTarget?.progress}
                current={dashboard.monthlySales.count}
                goal={dashboard.monthlySales.goal}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
