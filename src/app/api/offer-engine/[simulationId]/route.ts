import { NextResponse, type NextRequest } from "next/server";
import { authService } from "@/services/auth.service";
import { offerEngineService } from "@/services/offer-engine.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ simulationId: string }> },
) {
  const user = await authService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { simulationId } = await params;
  if (!simulationId) {
    return NextResponse.json({ error: "Simulación requerida." }, { status: 400 });
  }

  try {
    const record = await offerEngineService.getSimulation(simulationId, user);
    if (!record) {
      return NextResponse.json({ error: "Simulación no encontrada." }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (error) {
    console.error("[GET /api/offer-engine/[simulationId]]", error);
    return NextResponse.json({ error: "No se pudo cargar la simulación." }, { status: 500 });
  }
}
