import { NextResponse } from "next/server";
import { requireCampaignActor } from "@/lib/require-campaign-actor";
import { campaignService } from "@/services/campaign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vista previa con ejemplos reales del mensaje ya resuelto (sección 14). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { id } = await context.params;
  try {
    const previews = await campaignService.previewMessages(actor, id);
    return NextResponse.json(previews);
  } catch (error) {
    console.error("[GET /api/admin/campaigns/:id/preview]", error);
    const message = error instanceof Error ? error.message : "No se pudo generar la vista previa.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
