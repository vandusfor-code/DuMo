import { NextResponse } from "next/server";
import { requireCampaignActor } from "@/lib/require-campaign-actor";
import { campaignService } from "@/services/campaign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { id } = await context.params;
  try {
    const campaign = await campaignService.start(actor, id);
    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[POST /api/admin/campaigns/:id/start]", error);
    const message = error instanceof Error ? error.message : "No se pudo iniciar la campaña.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
