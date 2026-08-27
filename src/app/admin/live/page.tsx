"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LiveAdvisorsTable, LiveMetrics } from "@/components/admin/live/live-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { QueryStaleBanner, shouldShowFatalQueryError } from "@/components/shared/query-state";
import { businessDateISO } from "@/lib/date";
import { useLiveSnapshot } from "@/hooks/use-admin-live";

export default function AdminLivePage() {
  const [selectedDate, setSelectedDate] = useState(() => businessDateISO());
  const query = useLiveSnapshot(selectedDate);
  const { data, isLoading, refetch } = query;
  const fatal = shouldShowFatalQueryError(query);

  return (
    <div>
      <AdminPageHeader
        title="Live."
        subtitle="Monitorea en tiempo real la actividad de tu equipo comercial."
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {fatal ? (
        <ErrorState
          title="No se pudo cargar Live"
          message="Ocurrió un problema al consultar el estado del equipo. Verifica tu conexión e intenta nuevamente."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <QueryStaleBanner visible={query.isError && !!data} onRetry={() => refetch()} />

          {isLoading && !data ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[108px] rounded-card" />
                ))}
              </div>
              <Skeleton className="h-[420px] rounded-card" />
            </div>
          ) : data ? (
            <>
              <LiveMetrics summary={data.summary} />
              <LiveAdvisorsTable advisors={data.advisors} />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
