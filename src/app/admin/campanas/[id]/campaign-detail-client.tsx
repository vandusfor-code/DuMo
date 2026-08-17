"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Pause, Play, Square } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CampaignStatusBadge } from "@/components/admin/campaigns/campaign-status-badge";
import { CampaignProgressBar } from "@/components/admin/campaigns/campaign-progress-bar";
import {
  useCampaign,
  useCancelCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useStaleContactAction,
} from "@/hooks/use-campaigns";

const EVENT_LABELS: Record<string, string> = {
  CAMPAIGN_CREATED: "Campaña creada",
  FILE_IMPORTED: "Archivo importado",
  CONTACT_VALIDATED: "Contactos validados",
  CAMPAIGN_STARTED: "Campaña iniciada",
  MESSAGE_QUEUED: "Mensaje en cola",
  MESSAGE_PROCESSING: "Procesando contacto",
  MESSAGE_SENT: "Mensaje enviado",
  MESSAGE_FAILED: "Envío falló",
  CAMPAIGN_PAUSED: "Campaña pausada",
  CAMPAIGN_RESUMED: "Campaña reanudada",
  CAMPAIGN_CANCELLED: "Campaña cancelada",
  CAMPAIGN_AUTO_PAUSED: "Auto-pausada por condición anormal",
  OPT_OUT_DETECTED: "Opt-out detectado",
  CAMPAIGN_COMPLETED: "Campaña completada",
  CONTACT_STALE_REQUEUED: "Contacto atascado reintentado",
  CONTACT_STALE_MARKED_FAILED: "Contacto atascado marcado como fallido",
  CONTACT_RESPONSE_RECEIVED: "Respuesta recibida",
};

export function CampaignDetailClient({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useCampaign(campaignId);
  const pause = usePauseCampaign(campaignId);
  const resume = useResumeCampaign(campaignId);
  const cancel = useCancelCampaign(campaignId);
  const staleAction = useStaleContactAction(campaignId);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <ErrorState title="No se pudo cargar la campaña" onRetry={() => refetch()} />
      </div>
    );
  }

  const { campaign, countsByStatus, events, staleContacts } = data;
  const canPause = campaign.status === "EJECUTANDO" || campaign.status === "AUTO_PAUSADA";
  const canResume = campaign.status === "PAUSADA" || campaign.status === "AUTO_PAUSADA";
  const canCancel = !["COMPLETADA", "CANCELADA"].includes(campaign.status);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/campanas")}
            className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" /> Campañas
          </button>
          <AdminPageHeader title={campaign.name} subtitle={campaign.description || undefined} />
        </div>
        <div className="flex items-center gap-2">
          {canResume ? (
            <Button onClick={() => resume.mutate()} disabled={resume.isPending}>
              <Play className="size-4" /> Reanudar
            </Button>
          ) : null}
          {canPause ? (
            <Button variant="secondary" onClick={() => pause.mutate()} disabled={pause.isPending}>
              <Pause className="size-4" /> Pausar
            </Button>
          ) : null}
          {canCancel ? (
            <Button variant="secondary" onClick={() => setConfirmCancel(true)} disabled={cancel.isPending}>
              <Square className="size-4" /> Cancelar
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <CampaignStatusBadge status={campaign.status} />
          <span className="text-[12px] text-muted">
            {campaign.startedAt ? `Iniciada ${new Date(campaign.startedAt).toLocaleString("es-CL")}` : "Aún no iniciada"}
          </span>
        </div>
        <CampaignProgressBar sent={campaign.sentCount} total={campaign.totalContacts} />

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Enviados" value={campaign.sentCount} />
          <Stat label="Pendientes" value={countsByStatus.PENDING ?? 0} />
          <Stat label="Respuestas" value={campaign.responseCount} />
          <Stat label="Errores" value={campaign.failedCount} />
          <Stat label="Excluidos" value={campaign.excludedCount} />
        </div>

        {campaign.status === "AUTO_PAUSADA" && campaign.riskReason ? (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-[13px] text-warning-ink">
            <AlertTriangle className="mt-0.5 size-[18px] shrink-0" />
            <div>
              <p className="font-semibold">Campaña pausada automáticamente</p>
              <p className="mt-0.5">{campaign.riskReason}</p>
            </div>
          </div>
        ) : null}
      </Card>

      {staleContacts.length > 0 ? (
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-ink">Contactos atascados</h3>
          <p className="mt-1 text-[13px] text-muted">
            El worker se interrumpió antes de terminar el envío — decide manualmente qué hacer con cada uno (nunca se reintenta solo).
          </p>
          <ul className="mt-3 space-y-2">
            {staleContacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5 text-[13px]">
                <span className="text-ink">{c.name || c.phone} · {c.phone}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={staleAction.isPending}
                    onClick={() => staleAction.mutate({ contactId: c.id, action: "requeue" })}
                  >
                    Reintentar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={staleAction.isPending}
                    onClick={() => staleAction.mutate({ contactId: c.id, action: "mark-failed" })}
                  >
                    Marcar fallido
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="p-5">
        <h3 className="text-[15px] font-semibold text-ink">Últimos eventos</h3>
        <ul className="mt-3 space-y-2">
          {events.length === 0 ? (
            <p className="text-[13px] text-muted">Sin eventos todavía.</p>
          ) : (
            events.map((e) => (
              <li key={e.id} className="flex items-center justify-between border-b border-line pb-2 text-[13px] last:border-0">
                <span className="text-ink">{EVENT_LABELS[e.eventType] ?? e.eventType}</span>
                <span className="text-muted">{new Date(e.createdAt).toLocaleString("es-CL")}</span>
              </li>
            ))
          )}
        </ul>
      </Card>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar campaña"
        description="Los contactos pendientes no recibirán mensaje. Los ya enviados quedan tal cual — esto no se puede deshacer."
        confirmLabel="Cancelar campaña"
        isLoading={cancel.isPending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={async () => {
          await cancel.mutateAsync();
          setConfirmCancel(false);
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[12px] text-muted">{label}</p>
      <p className="text-[20px] font-semibold text-ink">{value}</p>
    </div>
  );
}
