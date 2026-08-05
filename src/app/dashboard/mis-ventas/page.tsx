"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesSummary } from "@/components/sales/sales-summary";
import { SalesFilters, type SalesRange } from "@/components/sales/sales-filters";
import { SalesTable } from "@/components/sales/sales-table";
import { useSales } from "@/hooks/use-sales";
import { businessDateISO } from "@/lib/date";
import type { SaleSummary } from "@/types/sale";

/** Keeps a sale if its date falls within the selected range (Chile business time). */
function inRange(dateIso: string, range: SalesRange): boolean {
  if (range === "all") return true;
  const todayStr = businessDateISO();

  if (range === "today") return dateIso === todayStr;
  if (range === "month") return dateIso.slice(0, 7) === todayStr.slice(0, 7);

  const [y, m, d] = todayStr.split("-").map(Number);
  const today = new Date(y, m - 1, d);
  const [sy, sm, sd] = dateIso.split("-").map(Number);
  const date = new Date(sy, (sm ?? 1) - 1, sd ?? 1);
  const dayOfWeek = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return date >= monday && date <= sunday;
}

export default function MisVentasPage() {
  const { data, isLoading, isFetching } = useSales();
  const [range, setRange] = useState<SalesRange>("today");

  const sales = data ?? [];

  const filtered = useMemo<SaleSummary[]>(
    () => sales.filter((s) => inRange(s.date, range)),
    [sales, range],
  );

  const totalLines = filtered.reduce((sum, s) => sum + s.lines, 0);
  const showSkeleton = isLoading && isFetching && sales.length === 0;

  return (
    <div className="space-y-6 pt-1">
      <PageHeader
        title="Mis Ventas"
        subtitle="Consulta y gestiona todas las ventas que has registrado."
        actions={<SalesFilters range={range} onRangeChange={setRange} />}
      />

      {showSkeleton ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-card" />
            <Skeleton className="h-28 rounded-card" />
          </div>
          <Skeleton className="h-96 rounded-card" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <SalesSummary totalSales={filtered.length} totalLines={totalLines} />
          <Card className="p-7">
            <SalesTable data={filtered} />
          </Card>
        </motion.div>
      )}
    </div>
  );
}
