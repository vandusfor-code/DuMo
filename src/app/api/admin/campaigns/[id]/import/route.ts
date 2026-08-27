import { NextResponse } from "next/server";
import { requireCampaignActor } from "@/lib/require-campaign-actor";
import { campaignService } from "@/services/campaign.service";
import type { CampaignColumnMapping } from "@/types/campaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * El archivo se parsea en el cliente (mismo patrón que PCS) y llega acá ya
 * como filas + mapeo de columnas confirmado por el usuario — la validación
 * que importa (teléfono, dedupe, suppression list) se recalcula 100% acá.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await requireCampaignActor();
  if (!actor) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { id } = await context.params;
  try {
    const body = await request.json();
    const rows = body.rows as Record<string, string>[] | undefined;
    const mapping = body.mapping as CampaignColumnMapping | undefined;
    if (!Array.isArray(rows) || !mapping) {
      return NextResponse.json({ error: "Faltan filas o mapeo de columnas." }, { status: 400 });
    }
    const summary = await campaignService.confirmImportAndValidate(actor, id, rows, mapping);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[POST /api/admin/campaigns/:id/import]", error);
    const message = error instanceof Error ? error.message : "No se pudo importar los contactos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
