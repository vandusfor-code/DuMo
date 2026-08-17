"use client";

import { StatusBadge, type StatusBadgeVariant } from "@/components/leads/premium/status-badge";
import type { CampaignStatus } from "@/types/campaign";

const STATUS_META: Record<CampaignStatus, { label: string; variant: StatusBadgeVariant }> = {
  BORRADOR: { label: "Borrador", variant: "pending" },
  VALIDANDO: { label: "Validando", variant: "pending" },
  PROGRAMADA: { label: "Programada", variant: "pending" },
  EN_COLA: { label: "En cola", variant: "in_progress" },
  EJECUTANDO: { label: "Ejecutando", variant: "active" },
  PAUSADA: { label: "Pausada", variant: "pending" },
  AUTO_PAUSADA: { label: "Auto-pausada", variant: "error" },
  COMPLETADA: { label: "Completada", variant: "active" },
  CANCELADA: { label: "Cancelada", variant: "error" },
  ERROR: { label: "Error", variant: "error" },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const meta = STATUS_META[status];
  return <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>;
}
