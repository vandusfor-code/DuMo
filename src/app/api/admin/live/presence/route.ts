import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { adminLiveService } from "@/services/admin-live.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

/** Admin/supervisor: cambia el estado de presencia de una asesora. */
export async function PATCH(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const advisorId = String((body as { advisorId?: string }).advisorId ?? "").trim();
  const status = String((body as { status?: string }).status ?? "").trim();

  if (!advisorId) {
    return NextResponse.json({ error: "advisorId requerido." }, { status: 422 });
  }
  if (!status) {
    return NextResponse.json({ error: "status requerido." }, { status: 422 });
  }

  try {
    const result = await adminLiveService.setAdvisorPresence(
      advisorId,
      status,
      session.userId,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[PATCH /api/admin/live/presence]", error);
    const message = error instanceof Error ? error.message : "No se pudo actualizar el estado.";
    const statusCode = message.includes("no encontrada") || message.includes("inválido") ? 422 : 400;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
