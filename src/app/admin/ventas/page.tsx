"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminSalesFilters,
  EMPTY_FILTERS,
  type AppliedFilters,
} from "@/components/admin/admin-sales-filters";
import { AdminSalesKpis } from "@/components/admin/admin-sales-kpis";
import { AdminSalesTable } from "@/components/admin/admin-sales-table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useAdminSales } from "@/hooks/use-admin-sales";
import { useAdminAdvisors } from "@/hooks/use-admin-users";
import type { AdminSalesFilters as Filters } from "@/types/admin-sale";

export default function AdminVentasPage() {
  const [applied, setApplied] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const { data: advisorsResult } = useAdminAdvisors();
  const advisors = advisorsResult?.rows ?? [];

  const filters: Filters = {
    ...applied,
    dateFrom: applied.dateFrom || undefined,
    dateTo: applied.dateTo || undefined,
    page,
    pageSize: 10,
  };
  const { data, isLoading, isError, refetch } = useAdminSales(filters);

  const apply = (f: AppliedFilters) => {
    setApplied(f);
    setPage(1);
  };
  const clear = () => {
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  return (
    <div>
      <AdminPageHeader
        title="Ventas"
        subtitle="Administración total de las ventas registradas en el sistema"
      />

      <div className="space-y-5">
        <AdminSalesFilters advisors={advisors} onApply={apply} onClear={clear} />

        {isError && !data ? (
          <ErrorState title="No se pudieron cargar las ventas" onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-card" />
              ))}
            </div>
            <Skeleton className="h-[520px] rounded-card" />
          </div>
        ) : (
          <>
            <AdminSalesKpis summary={data.summary} />
            <AdminSalesTable
              data={data.rows}
              total={data.total}
              page={page}
              pageSize={10}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
