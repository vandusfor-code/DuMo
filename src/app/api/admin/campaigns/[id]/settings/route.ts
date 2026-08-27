import { NextResponse } from "next/server";
import { requireCampaignActor } from "@/lib/require-campaign-actor";
import { campaignService } from "@/services/campaign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { id } = await context.params;
  try {
    const body = await request.json();
    await campaignService.updateSettings(actor, id, {
      intervalSeconds: Number(body.intervalSeconds),
      concurrency: Number(body.concurrency),
      maxRetries: Number(body.maxRetries ?? 0),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/campaigns/:id/settings]", error);
    const message = error instanceof Error ? error.message : "No se pudo guardar la configuración.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
