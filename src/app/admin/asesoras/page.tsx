"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdvisorsKpis, AdvisorsTable } from "@/components/admin/asesoras/advisors-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryStaleBanner, shouldShowFatalQueryError } from "@/components/shared/query-state";
import { ErrorState } from "@/components/shared/error-state";
import { useAdminAdvisors } from "@/hooks/use-admin-users";

export default function AdminAsesorasPage() {
  const query = useAdminAdvisors();
  const { data, isLoading, isError, refetch } = query;
  const fatal = shouldShowFatalQueryError(query);

  return (
    <div>
      <AdminPageHeader
        title="Asesoras"
        subtitle="Desempeño comercial y estado de las asesoras activas"
      />

      {fatal ? (
        <ErrorState title="No se pudieron cargar las asesoras" onRetry={() => refetch()} />
      ) : (
        <>
          <QueryStaleBanner visible={isError && !!data} onRetry={() => refetch()} />
          {isLoading && !data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-card" />
        </div>
          ) : data ? (
        <div className="space-y-5">
          <AdvisorsKpis summary={data.summary} />
          <AdvisorsTable rows={data.rows} />
        </div>
          ) : null}
        </>
      )}
    </div>
  );
}
