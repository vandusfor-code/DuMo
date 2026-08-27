import { redirect } from "next/navigation";
import { getTokenPayload } from "@/lib/require-admin";
import { CampaignDetailClient } from "./campaign-detail-client";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const payload = await getTokenPayload();
  if (!payload || payload.role !== "administrador") {
    redirect("/admin");
  }
  const { id } = await params;
  return <CampaignDetailClient campaignId={id} />;
}
