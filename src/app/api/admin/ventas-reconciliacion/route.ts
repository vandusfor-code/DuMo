import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { salesReconciliationService } from "@/services/sales-reconciliation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  try {
    const rows = await salesReconciliationService.listOrphanGestiones();
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[GET /api/admin/ventas-reconciliacion]", error);
    return NextResponse.json(
      { error: "No se pudo cargar la lista de reconciliación." },
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
    if (body.action === "dismiss") {
      await salesReconciliationService.dismiss(body.gestionId, session.userId);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "register") {
      // El cliente manda el objeto completo de la gestión (ya lo tiene de la
      // lista) — evita una segunda lectura y asegura que se registre
      // exactamente lo que el admin está viendo en pantalla.
      const result = await salesReconciliationService.registerFromGestion(
        body.gestion,
        session.userId,
      );
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/admin/ventas-reconciliacion]", error);
    const message = error instanceof Error ? error.message : "No se pudo completar la acción.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
