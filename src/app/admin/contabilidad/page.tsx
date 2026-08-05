"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AccountingCharts,
  AccountingKpis,
  AddExpenseDialog,
  ExpensesTable,
} from "@/components/admin/accounting/accounting-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useAccounting, useCreateExpense, useDeleteExpense } from "@/hooks/use-admin-accounting";

export default function AdminContabilidadPage() {
  const now = new Date();
  const filters = {
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  };
  const { data, isLoading, isError, refetch } = useAccounting(filters);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div>
      <AdminPageHeader
        title="Contabilidad"
        subtitle="Control financiero del negocio — presupuesto, gastos y utilidad"
      />

      {isError ? (
        <ErrorState title="No se pudo cargar contabilidad" onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-card" />
        </div>
      ) : (
        <div className="space-y-5">
          <AccountingKpis summary={data.summary} />
          <AccountingCharts chart={data.chart} />
          <ExpensesTable
            expenses={data.expenses}
            onAdd={() => setDialogOpen(true)}
            onDelete={(id) => deleteExpense.mutate(id)}
          />
        </div>
      )}

      <AddExpenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={async (v) => {
          await createExpense.mutateAsync({
            ...v,
            user: "Administrador",
          });
        }}
      />
    </div>
  );
}
