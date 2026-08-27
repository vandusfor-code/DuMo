"use client";

import { CheckCircle2, Clock3, MessageCircleReply, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { CampaignProgressBar } from "./campaign-progress-bar";
import type { Campaign } from "@/types/campaign";

export function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const pending = Math.max(campaign.totalContacts - campaign.sentCount - campaign.failedCount, 0);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="cursor-pointer space-y-4 p-5 transition-colors hover:bg-canvas/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-semibold text-ink">{campaign.name}</h3>
          {campaign.description ? (
            <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{campaign.description}</p>
          ) : null}
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      <CampaignProgressBar sent={campaign.sentCount} total={campaign.totalContacts} />

      <div className="grid grid-cols-4 gap-2 text-[12px]">
        <div className="flex items-center gap-1.5 text-success-ink">
          <CheckCircle2 className="size-3.5" /> {campaign.sentCount} enviados
        </div>
        <div className="flex items-center gap-1.5 text-muted">
          <Clock3 className="size-3.5" /> {pending} pendientes
        </div>
        <div className="flex items-center gap-1.5 text-brand">
          <MessageCircleReply className="size-3.5" /> {campaign.responseCount} respuestas
        </div>
        <div className="flex items-center gap-1.5 text-danger-ink">
          <TriangleAlert className="size-3.5" /> {campaign.failedCount} errores
        </div>
      </div>

      {campaign.riskStatus === "auto_paused" && campaign.riskReason ? (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12px] text-warning-ink">
          {campaign.riskReason}
        </p>
      ) : null}
    </Card>
  );
}
