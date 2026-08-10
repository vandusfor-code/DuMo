"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  AdminPendientesFilters as AdminPendientesFiltersPanel,
  EMPTY_PENDIENTES_FILTERS,
  type PendientesAppliedFilters,
} from "@/components/admin/pendientes/admin-pendientes-filters";
import { AdminPendientesKpis } from "@/components/admin/pendientes/admin-pendientes-kpis";
import { AdminPendientesTable } from "@/components/admin/pendientes/admin-pendientes-table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useAdminPendientes } from "@/hooks/use-admin-pendientes";
import { useAdminAdvisors } from "@/hooks/use-admin-users";
import { useTipificationsAdmin } from "@/hooks/use-tipifications";
import type { AdminPendientesFilters } from "@/types/admin-pendientes";

export default function AdminPendientesPage() {
  const [applied, setApplied] = useState<PendientesAppliedFilters>(EMPTY_PENDIENTES_FILTERS);
  const [page, setPage] = useState(1);
  const { data: advisorsResult } = useAdminAdvisors();
  const { data: tipifications } = useTipificationsAdmin();
  const advisors = advisorsResult?.rows ?? [];

  const filters: AdminPendientesFilters = {
    ...applied,
    page,
    pageSize: 10,
  };

  const { data, isLoading, isError, refetch } = useAdminPendientes(filters);

  const tipificationOptions = useMemo(() => {
    const fromCatalog = (tipifications ?? [])
      .filter((t) => t.createsFollowUp)
      .map((t) => ({ slug: t.slug, name: t.name }));
    const fromSummary = data?.summary.byType ?? [];
    const merged = new Map<string, { slug: string; name: string }>();
    for (const t of fromCatalog) merged.set(t.slug, t);
    for (const t of fromSummary) {
      if (!merged.has(t.slug)) merged.set(t.slug, { slug: t.slug, name: t.name });
    }
    return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [tipifications, data?.summary.byType]);

  const apply = (f: PendientesAppliedFilters) => {
    setApplied(f);
    setPage(1);
  };

  const clear = () => {
    setApplied(EMPTY_PENDIENTES_FILTERS);
    setPage(1);
  };

  return (
    <div>
      <AdminPageHeader
        title="Pendientes"
        subtitle="Seguimientos programados pendientes de gestión — cola admin"
      />

      <div className="space-y-5">
        <AdminPendientesFiltersPanel
          advisors={advisors}
          tipificationOptions={tipificationOptions}
          onApply={apply}
          onClear={clear}
        />

        {isError && !data ? (
          <ErrorState title="No se pudieron cargar los pendientes" onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-card" />
              ))}
            </div>
            <Skeleton className="h-[480px] rounded-card" />
          </div>
        ) : (
          <>
            <AdminPendientesKpis summary={data.summary} />
            <AdminPendientesTable
              data={data.rows}
              total={data.total}
              page={page}
              pageSize={10}
              advisors={advisors}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
