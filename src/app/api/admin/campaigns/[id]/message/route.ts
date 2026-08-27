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
    await campaignService.updateMessage(actor, id, String(body.messageTemplate ?? ""));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/campaigns/:id/message]", error);
    const message = error instanceof Error ? error.message : "No se pudo guardar el mensaje.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
