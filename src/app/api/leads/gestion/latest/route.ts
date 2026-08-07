import { NextResponse, type NextRequest } from "next/server";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Última gestión guardada para precargar el formulario del asesor. */
export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId requerido." }, { status: 400 });
  }

  try {
    const draft = await leadsService.getLatestGestionDraft(conversationId);
    return NextResponse.json(draft, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[GET /api/leads/gestion/latest]", error);
    return NextResponse.json({ error: "No se pudo cargar la gestión." }, { status: 500 });
  }
}
