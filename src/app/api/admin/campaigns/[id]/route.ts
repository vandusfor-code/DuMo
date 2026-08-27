import { NextResponse } from "next/server";
import { requireCampaignActor } from "@/lib/require-campaign-actor";
import { campaignService } from "@/services/campaign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { id } = await context.params;
  try {
    const detail = await campaignService.getDetail(actor, id);
    return NextResponse.json(detail);
  } catch (error) {
    console.error("[GET /api/admin/campaigns/:id]", error);
    const message = error instanceof Error ? error.message : "Campaña no encontrada.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
