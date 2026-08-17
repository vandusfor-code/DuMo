import { NextResponse } from "next/server";
import { requireCampaignActor } from "@/lib/require-campaign-actor";
import { campaignService } from "@/services/campaign.service";
import { normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista global de exclusión (sección 12) — "no contactar" persistente hasta un cambio explícito. */
export async function GET() {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const data = await campaignService.listSuppressions(actor);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  try {
    const body = await request.json();
    const digits = normalizeWhatsAppPhoneDigits(String(body.phone ?? ""));
    if (!digits) return NextResponse.json({ error: "Teléfono inválido." }, { status: 400 });
    await campaignService.addSuppression(actor, digits, String(body.reason ?? ""), "manual");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/admin/campaigns/suppressions]", error);
    return NextResponse.json({ error: "No se pudo agregar a la lista de exclusión." }, { status: 500 });
  }
}
