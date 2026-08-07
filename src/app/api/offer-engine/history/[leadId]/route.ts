import { NextResponse, type NextRequest } from "next/server";
import { authService } from "@/services/auth.service";
import { offerEngineService } from "@/services/offer-engine.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const user = await authService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { leadId } = await params;
  if (!leadId) {
    return NextResponse.json({ error: "Lead requerido." }, { status: 400 });
  }

  try {
    const history = await offerEngineService.history(leadId, user);
    return NextResponse.json(history);
  } catch (error) {
    console.error("[GET /api/offer-engine/history]", error);
    return NextResponse.json({ error: "No se pudo cargar el historial." }, { status: 500 });
  }
}
