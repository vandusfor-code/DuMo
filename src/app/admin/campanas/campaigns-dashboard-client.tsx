"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { CampaignCard } from "@/components/admin/campaigns/campaign-card";
import { CampaignStatusBadge } from "@/components/admin/campaigns/campaign-status-badge";
import { CampaignKillSwitch } from "@/components/admin/campaigns/campaign-kill-switch";
import { useCampaigns } from "@/hooks/use-campaigns";

const ACTIVE_STATUSES = new Set(["EJECUTANDO", "EN_COLA", "PROGRAMADA", "AUTO_PAUSADA", "PAUSADA"]);

function formatDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt) return "—";
  const end = finishedAt ? new Date(finishedAt) : new Date();
  const ms = end.getTime() - new Date(startedAt).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
}

export function CampaignsDashboardClient() {
  const router = useRouter();
  const { data: campaigns, isLoading, isError, refetch } = useCampaigns();

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState title="No se pudieron cargar las campañas" onRetry={() => refetch()} />
      </div>
    );
  }

  const list = campaigns ?? [];
  const active = list.filter((c) => ACTIVE_STATUSES.has(c.status));
  const history = list.filter((c) => !ACTIVE_STATUSES.has(c.status) || c.status === "PAUSADA" || c.status === "AUTO_PAUSADA");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader title="Campañas" subtitle="Mensajería masiva controlada — cola, pausas y trazabilidad completa." />
        <div className="flex items-center gap-2">
          <CampaignKillSwitch />
          <Button onClick={() => router.push("/admin/campanas/nueva")}>
            <Plus className="size-4" />
            Nueva campaña
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-card" />
          ))}
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-[15px] font-semibold text-ink">Campañas activas</h2>
            {active.length === 0 ? (
              <Card className="p-8 text-center text-[14px] text-muted">
                No hay campañas en curso. Crea una nueva para empezar.
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {active.map((c) => (
                  <CampaignCard key={c.id} campaign={c} onClick={() => router.push(`/admin/campanas/${c.id}`)} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-[15px] font-semibold text-ink">Historial</h2>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-line bg-canvas/40 text-[12px] uppercase tracking-wide text-muted">
                      <th className="px-5 py-3 font-medium">Nombre</th>
                      <th className="px-5 py-3 font-medium">Contactos</th>
                      <th className="px-5 py-3 font-medium">Enviados</th>
                      <th className="px-5 py-3 font-medium">Respuestas</th>
                      <th className="px-5 py-3 font-medium">Errores</th>
                      <th className="px-5 py-3 font-medium">Excluidos</th>
                      <th className="px-5 py-3 font-medium">Duración</th>
                      <th className="px-5 py-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-muted">
                          Aún no hay campañas.
                        </td>
                      </tr>
                    ) : (
                      list.map((c) => (
                        <tr
                          key={c.id}
                          className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas/40"
                          onClick={() => router.push(`/admin/campanas/${c.id}`)}
                        >
                          <td className="px-5 py-4 font-medium text-ink">{c.name}</td>
                          <td className="px-5 py-4 text-muted">{c.totalContacts}</td>
                          <td className="px-5 py-4 text-muted">{c.sentCount}</td>
                          <td className="px-5 py-4 text-muted">{c.responseCount}</td>
                          <td className="px-5 py-4 text-muted">{c.failedCount}</td>
                          <td className="px-5 py-4 text-muted">{c.excludedCount}</td>
                          <td className="px-5 py-4 text-muted">{formatDuration(c.startedAt, c.finishedAt)}</td>
                          <td className="px-5 py-4">
                            <CampaignStatusBadge status={c.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
