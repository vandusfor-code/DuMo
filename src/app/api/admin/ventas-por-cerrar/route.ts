import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { duoSalesService } from "@/services/duo-sales.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  try {
    const rows = await duoSalesService.listAll();
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[GET /api/admin/ventas-por-cerrar]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las ventas por cerrar." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  try {
    const body = await request.json();
    if (body.action === "assign") {
      const sale = await duoSalesService.assign(body.id, {
        id: body.advisorId,
        name: body.advisorName,
      });
      return NextResponse.json(sale);
    }
    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/admin/ventas-por-cerrar]", error);
    const message = error instanceof Error ? error.message : "No se pudo completar la acción.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
