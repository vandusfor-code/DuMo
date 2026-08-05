"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/error-state";
import {
  CommissionCards,
  type CommissionTotals,
} from "@/components/commissions/commission-cards";
import {
  CommissionMonthFilter,
  buildMonthOptions,
} from "@/components/commissions/commission-month-filter";
import { CommissionTable } from "@/components/commissions/commission-table";
import { CommissionSummary } from "@/components/commissions/commission-summary";
import { useCommissions } from "@/hooks/use-commissions";
import { formatLongDate } from "@/lib/format";
import type { Commission } from "@/types/commission";

type Tab = "all" | "paid" | "pending";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** 15th of the month following the selected one. */
function nextPaymentLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const next = new Date(y, m, 15); // m is 1-based -> Date month m = next month
  return formatLongDate(
    `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-15`,
  );
}

function exportCsv(rows: Commission[], month: string) {
  const header = ["Fecha", "ID Venta", "Cliente", "Lineas", "Comision", "Estado", "Fecha de pago"];
  const body = rows.map((r) => [
    r.date,
    r.saleId,
    r.customerName,
    String(r.lines),
    String(r.amount),
    r.status === "paid" ? "Pagada" : "Pendiente",
    r.paymentDate ?? "",
  ]);
  const csv = [header, ...body]
    .map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comisiones-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ComisionesPage() {
  const [month, setMonth] = useState<string>(currentMonth());
  const [tab, setTab] = useState<Tab>("all");
  const { data, isLoading, isError, refetch } = useCommissions(month);

  const commissions = useMemo(() => data ?? [], [data]);

  const totals = useMemo<CommissionTotals>(() => {
    const generated = commissions.reduce((s, c) => s + c.amount, 0);
    const paid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0);
    return {
      generated,
      paid,
      pending: generated - paid,
      salesCount: commissions.length,
    };
  }, [commissions]);

  const tableData = useMemo(() => {
    if (tab === "all") return commissions;
    return commissions.filter((c) => c.status === tab);
  }, [commissions, tab]);

  const monthLabel =
    buildMonthOptions().find((o) => o.value === month)?.label ?? month;

  return (
    <div className="space-y-6 pt-1">
      <PageHeader
        title="Comisiones"
        subtitle="Consulta el resumen y detalle de tus comisiones."
        actions={<CommissionMonthFilter month={month} onMonthChange={setMonth} />}
      />

      {isError && !data ? (
        <ErrorState
          title="No se pudieron cargar las comisiones"
          message="Intenta nuevamente en unos segundos."
          onRetry={() => refetch()}
        />
      ) : isLoading || !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-card" />
            ))}
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
          <CommissionCards totals={totals} />

          <Card className="p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="paid">Pagadas</TabsTrigger>
                  <TabsTrigger value="pending">Pendientes</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="secondary"
                onClick={() => exportCsv(tableData, month)}
                disabled={tableData.length === 0}
              >
                <Download className="size-[18px]" />
                Exportar
              </Button>
            </div>

            <div className="mt-5">
              <CommissionTable data={tableData} />
            </div>
          </Card>

          <CommissionSummary
            monthLabel={monthLabel}
            totals={totals}
            nextPaymentLabel={nextPaymentLabel(month)}
          />
        </motion.div>
      )}
    </div>
  );
}
