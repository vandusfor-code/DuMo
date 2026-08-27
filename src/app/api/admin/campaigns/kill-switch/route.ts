import { NextResponse } from "next/server";
import { requireCampaignActor } from "@/lib/require-campaign-actor";
import { campaignService } from "@/services/campaign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const active = await campaignService.getKillSwitch();
  return NextResponse.json({ active });
}

/** Interruptor de emergencia global — corta el envío de TODAS las campañas de inmediato. */
export async function POST(request: Request) {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  try {
    const body = await request.json();
    await campaignService.setKillSwitch(Boolean(body.active));
    return NextResponse.json({ active: Boolean(body.active) });
  } catch (error) {
    console.error("[POST /api/admin/campaigns/kill-switch]", error);
    return NextResponse.json({ error: "No se pudo cambiar el interruptor." }, { status: 500 });
  }
}
