import { NextResponse } from "next/server";
import { requireCampaignActor } from "@/lib/require-campaign-actor";
import { campaignService } from "@/services/campaign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Acciones manuales sobre un contacto atascado en PROCESSING (worker
 * interrumpido a mitad del tick) — nunca automáticas, siempre disparadas
 * explícitamente por el admin, para no reenviar en silencio (sección 18/19).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; contactId: string }> },
) {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { id, contactId } = await context.params;
  try {
    const body = await request.json();
    if (body.action === "requeue") {
      await campaignService.requeueStaleContact(actor, id, contactId);
    } else if (body.action === "mark-failed") {
      await campaignService.markStaleContactFailed(actor, id, contactId);
    } else {
      return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/campaigns/:id/contacts/:contactId]", error);
    const message = error instanceof Error ? error.message : "No se pudo procesar la acción.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
