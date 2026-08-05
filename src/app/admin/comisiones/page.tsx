"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  CommissionFiltersBar,
  CommissionKpis,
  CommissionTable,
} from "@/components/admin/commissions/commission-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  useAdminCommissions,
  useMarkCommissionPaid,
} from "@/hooks/use-admin-commissions";
import { useAdminUsers } from "@/hooks/use-admin-users";
import type { AdminCommissionFilters } from "@/types/admin-commission";

export default function AdminComisionesPage() {
  const [filters, setFilters] = useState<AdminCommissionFilters>({
    month: "08",
    year: "2025",
    advisor: "all",
    status: "all",
  });
  const { data: users = [] } = useAdminUsers();
  const advisors = users.filter((u) => u.roleKey === "asesora").map((u) => ({ id: u.id, name: u.name }));
  const { data, isLoading, isError, refetch } = useAdminCommissions(filters);
  const markPaid = useMarkCommissionPaid();

  return (
    <div>
      <AdminPageHeader
        title="Comisiones"
        subtitle="Administración de pagos de comisiones — calculadas desde configuración comercial"
      />

      <div className="space-y-5">
        <CommissionFiltersBar
          filters={filters}
          advisors={advisors}
          onChange={setFilters}
        />

        {isError && !data ? (
          <ErrorState title="No se pudieron cargar las comisiones" onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-card" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-card" />
          </div>
        ) : (
          <>
            <CommissionKpis summary={data.summary} />
            <CommissionTable
              rows={data.rows}
              filters={filters}
              onMarkPaid={(id) => markPaid.mutate({ advisorId: id, filters })}
            />
          </>
        )}
      </div>
    </div>
  );
}
