import { NextResponse, type NextRequest } from "next/server";
import { getTenantScope } from "@/lib/tenant-scope";
import { adminLiveService } from "@/services/admin-live.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

/** Asesora (o cualquier usuario autenticado): cambia su propio estado de presencia. */
export async function PATCH(request: NextRequest) {
  const scope = await getTenantScope();
  if (!scope) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const status = String((body as { status?: string }).status ?? "").trim();
  if (!status) {
    return NextResponse.json({ error: "status requerido." }, { status: 422 });
  }

  if (scope.role !== "asesora") {
    return NextResponse.json(
      { error: "Solo las asesoras pueden cambiar su estado operativo desde aquí." },
      { status: 403 },
    );
  }

  try {
    const result = await adminLiveService.setAdvisorPresence(
      scope.userId,
      status,
      scope.userId,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[PATCH /api/advisors/me/presence]", error);
    const message = error instanceof Error ? error.message : "No se pudo actualizar el estado.";
    const statusCode = message.includes("inválido") ? 422 : 400;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
