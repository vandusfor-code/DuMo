"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Inbox,
  MessageCircle,
  Radio,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  ADVISOR_PRESENCE_LABELS,
  ADVISOR_PRESENCE_STATUSES,
  type AdvisorPresenceStatus,
} from "@/lib/advisor-presence";
import { InitialsAvatar, PhotoAvatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  adminTableHeaderCellClass,
  adminTableHeaderRowClass,
} from "@/lib/admin-table-header-styles";
import { useSetAdvisorPresence } from "@/hooks/use-admin-live";
import type { LiveAdvisorRow, LiveSnapshot } from "@/types/admin-live";

const PRESENCE_TRIGGER_CLASS: Record<AdvisorPresenceStatus, string> = {
  disponible: "border-success/25 bg-success-soft text-success-ink",
  bano: "border-warning/25 bg-warning-soft text-warning-ink",
  almuerzo: "border-brand/25 bg-brand-soft text-brand",
  desconectado: "border-line bg-canvas text-muted",
};

function MetricCard({
  icon,
  iconClass,
  label,
  value,
  subtext,
  subtextClass,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string;
  subtext: React.ReactNode;
  subtextClass?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl [&_svg]:size-[22px]",
            iconClass,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] text-muted">{label}</p>
          <p className="mt-0.5 text-[26px] font-bold leading-none tracking-tight text-ink">
            {value}
          </p>
          <p className={cn("mt-2 text-[12px]", subtextClass ?? "text-muted")}>{subtext}</p>
        </div>
      </div>
    </Card>
  );
}

function formatProductivityDelta(delta: number): React.ReactNode {
  if (delta === 0) return "Sin cambio vs ayer";
  const up = delta > 0;
  return (
    <>
      <span className={cn("font-semibold", up ? "text-success-ink" : "text-danger-ink")}>
        {up ? "↑" : "↓"} {Math.abs(delta)}%
      </span>
      <span className="text-muted"> vs ayer</span>
    </>
  );
}

export function LiveMetrics({ summary }: { summary: LiveSnapshot["summary"] }) {
  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={<Users />}
        iconClass="bg-brand-soft text-brand"
        label="Asesoras conectadas"
        value={String(summary.connectedAdvisors)}
        subtext={
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" />
            En línea ahora
          </span>
        }
      />
      <MetricCard
        icon={<Radio />}
        iconClass="bg-success-soft text-success-ink"
        label="Leads gestionados hoy"
        value={String(summary.leadsManagedToday)}
        subtext="Tipificaciones del equipo hoy"
      />
      <MetricCard
        icon={<Inbox />}
        iconClass="bg-brand-soft text-brand"
        label="Leads asignados ahora"
        value={String(summary.leadsAssignedNow)}
        subtext="Conversaciones con asesora asignada"
      />
      <MetricCard
        icon={<TrendingUp />}
        iconClass="bg-warning-soft text-warning-ink"
        label="Productividad del equipo"
        value={`${summary.teamProductivityPct}%`}
        subtext={formatProductivityDelta(summary.teamProductivityDeltaPct)}
      />
    </div>
  );
}

function PresenceStatusSelect({
  advisorId,
  value,
  disabled,
}: {
  advisorId: string;
  value: AdvisorPresenceStatus;
  disabled?: boolean;
}) {
  const setPresence = useSetAdvisorPresence();
  const [pendingStatus, setPendingStatus] = useState<AdvisorPresenceStatus | null>(null);

  const applyStatus = (status: AdvisorPresenceStatus) => {
    setPresence.mutate({ advisorId, status });
    setPendingStatus(null);
  };

  const handleChange = (next: string) => {
    const status = next as AdvisorPresenceStatus;
    if (status === value) return;
    if (status === "desconectado") {
      setPendingStatus(status);
      return;
    }
    applyStatus(status);
  };

  return (
    <>
      <Select
        value={value}
        onValueChange={handleChange}
        disabled={disabled || setPresence.isPending}
      >
        <SelectTrigger
          className={cn(
            "h-9 w-[148px] rounded-full border px-3 text-[13px] font-medium shadow-none",
            PRESENCE_TRIGGER_CLASS[value],
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {ADVISOR_PRESENCE_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {ADVISOR_PRESENCE_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ConfirmDialog
        open={pendingStatus === "desconectado"}
        title="Desconectar asesora"
        description="La asesora dejará de recibir leads y se cerrará su sesión activa. Deberá volver a iniciar sesión."
        confirmLabel="Desconectar"
        isLoading={setPresence.isPending}
        onConfirm={() => {
          if (pendingStatus) applyStatus(pendingStatus);
        }}
        onCancel={() => setPendingStatus(null)}
      />
    </>
  );
}

function AdvisorOnlineBadge({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px]",
        online ? "text-success-ink" : "text-muted",
      )}
    >
      <span
        className={cn("size-2 rounded-full", online ? "bg-success" : "bg-line")}
        aria-hidden
      />
      {online ? "En línea" : "Fuera de línea"}
    </span>
  );
}

export function LiveAdvisorsTable({ advisors }: { advisors: LiveAdvisorRow[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[16px] font-semibold text-ink">Asesoras conectadas</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow className={adminTableHeaderRowClass}>
            <TableHead className={adminTableHeaderCellClass}>Asesora</TableHead>
            <TableHead className={adminTableHeaderCellClass}>Leads asignados hoy</TableHead>
            <TableHead className={adminTableHeaderCellClass}>Leads gestionados hoy</TableHead>
            <TableHead className={adminTableHeaderCellClass}>Tiempo de conexión</TableHead>
            <TableHead className={adminTableHeaderCellClass}>Estado</TableHead>
            <TableHead className={cn(adminTableHeaderCellClass, "text-right")}>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {advisors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-muted">
                No hay asesoras activas.
              </TableCell>
            </TableRow>
          ) : (
            advisors.map((advisor) => (
              <TableRow key={advisor.id}>
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    {advisor.avatarUrl ? (
                      <PhotoAvatar src={advisor.avatarUrl} alt={advisor.name} />
                    ) : (
                      <InitialsAvatar initials={getInitials(advisor.name)} />
                    )}
                    <div>
                      <p className="text-[14px] font-medium text-ink">{advisor.name}</p>
                      <AdvisorOnlineBadge online={advisor.isOnline} />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-[14px] text-ink">
                    {advisor.leadsAssignedToday}{" "}
                    <span className="text-muted">
                      lead{advisor.leadsAssignedToday === 1 ? "" : "s"}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-[14px] text-ink">
                    {advisor.leadsManagedToday}{" "}
                    <span className="text-muted">
                      lead{advisor.leadsManagedToday === 1 ? "" : "s"}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <div className="min-w-[120px]">
                    <p className="text-[14px] font-medium text-ink">
                      {advisor.connectionTimeLabel ?? "—"}
                    </p>
                    {advisor.connectionProgressPct != null ? (
                      <div className="mt-1.5 h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-canvas">
                        <div
                          className="h-full rounded-full bg-success transition-all"
                          style={{ width: `${advisor.connectionProgressPct}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <PresenceStatusSelect
                    advisorId={advisor.id}
                    value={advisor.presenceStatus}
                  />
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-xl"
                    asChild
                  >
                    <Link
                      href="/admin/leads"
                      aria-label={`Abrir leads de ${advisor.name}`}
                      title="Ver leads"
                    >
                      <MessageCircle className="size-[18px]" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <p className="border-t border-line px-5 py-3 text-center text-[12px] text-muted">
        Los datos se actualizan en tiempo real cada 30 segundos.
      </p>
    </Card>
  );
}
