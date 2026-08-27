import { NextResponse, type NextRequest } from "next/server";
import { getAdvisorTenantScope } from "@/lib/tenant-scope";
import { duoSalesService } from "@/services/duo-sales.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const scope = await getAdvisorTenantScope();
  if (!scope) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  try {
    const rows = await duoSalesService.listForClosingAdvisor(scope.userId);
    return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[GET /api/dashboard/ventas-por-cerrar]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las ventas por cerrar." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const scope = await getAdvisorTenantScope();
  if (!scope) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (body.action === "addNote") {
      const existing = await duoSalesService.getById(body.id);
      if (!existing || existing.closingAdvisorId !== scope.userId) {
        return NextResponse.json({ error: "No autorizado para este caso." }, { status: 403 });
      }
      const text = String(body.text ?? "").trim();
      if (!text) {
        return NextResponse.json({ error: "La nota no puede estar vacía." }, { status: 400 });
      }
      const sale = await duoSalesService.addClosingNote(body.id, {
        text,
        author: scope.userName,
      });
      return NextResponse.json(sale);
    }
    if (body.action === "close") {
      const id = String(body.id ?? "");
      if (!id) {
        return NextResponse.json({ error: "Falta el id del caso." }, { status: 400 });
      }
      // Verificación explícita antes de tocar dinero, además de la que hace
      // el repositorio de forma atómica (WHERE status='assigned' AND
      // closing_advisor_id=...). Solo puede cerrar quien tiene el caso
      // asignado y activo — nunca una función de uso general.
      const existing = await duoSalesService.getById(id);
      if (!existing) {
        return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });
      }
      if (existing.status !== "assigned" || existing.closingAdvisorId !== scope.userId) {
        return NextResponse.json(
          { error: "Solo puedes cerrar casos que estén asignados a ti." },
          { status: 403 },
        );
      }
      const result = await duoSalesService.close(id, scope.userId);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/dashboard/ventas-por-cerrar]", error);
    const message = error instanceof Error ? error.message : "No se pudo completar la acción.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
