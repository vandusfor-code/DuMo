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
    const contacts = await campaignService.listContacts(actor, id);
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("[GET /api/admin/campaigns/:id/contacts]", error);
    const message = error instanceof Error ? error.message : "No se pudieron cargar los contactos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
