"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdvisorsKpis, AdvisorsTable } from "@/components/admin/asesoras/advisors-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useAdminAdvisors } from "@/hooks/use-admin-users";

export default function AdminAsesorasPage() {
  const { data, isLoading, isError, refetch } = useAdminAdvisors();

  return (
    <div>
      <AdminPageHeader
        title="Asesoras"
        subtitle="Desempeño comercial y estado de las asesoras activas"
      />

      {isError ? (
        <ErrorState title="No se pudieron cargar las asesoras" onRetry={() => refetch()} />
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
        <div className="space-y-5">
          <AdvisorsKpis summary={data.summary} />
          <AdvisorsTable rows={data.rows} />
        </div>
      )}
    </div>
  );
}
