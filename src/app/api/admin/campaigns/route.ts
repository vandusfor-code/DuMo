import { NextResponse, type NextRequest } from "next/server";
import { requireCampaignActor } from "@/lib/require-campaign-actor";
import { campaignService } from "@/services/campaign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  try {
    const data = await campaignService.list(actor);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/campaigns]", error);
    return NextResponse.json({ error: "No se pudieron cargar las campañas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  try {
    const body = await request.json();
    const campaign = await campaignService.create(actor, String(body.name ?? ""), String(body.description ?? ""));
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/campaigns]", error);
    const message = error instanceof Error ? error.message : "No se pudo crear la campaña.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
