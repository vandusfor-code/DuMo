import { NextResponse, type NextRequest } from "next/server";
import { authService } from "@/services/auth.service";
import { offerEngineService } from "@/services/offer-engine.service";
import { offerSimulationRequestSchema } from "@/lib/schemas/offer-simulation.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = offerSimulationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const user = await authService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const result = await offerEngineService.simulate(parsed.data, user);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo calcular la oferta.";
    console.error("[POST /api/offer-engine/simulate]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
