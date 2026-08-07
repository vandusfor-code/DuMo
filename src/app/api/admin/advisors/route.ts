import { NextResponse, type NextRequest } from "next/server";
import {
  emptyAdvisorsResult,
  withAdminFallback,
} from "@/lib/admin-api-fallbacks";
import { requireAdminSession } from "@/lib/require-admin";
import { adminAdvisorsService } from "@/services/admin-users.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const data = await withAdminFallback(
    () => adminAdvisorsService.list(),
    emptyAdvisorsResult(),
    "GET /api/admin/advisors",
  );
  return NextResponse.json(data);
}

/** Asigna meta mensual de ventas a una asesora. */
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

  const id = String((body as { id?: string }).id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id requerido." }, { status: 422 });
  }

  const raw = (body as { monthlySalesGoal?: unknown }).monthlySalesGoal;
  const monthlySalesGoal =
    raw === null || raw === "" || raw === undefined
      ? null
      : Number(raw);

  if (monthlySalesGoal != null && (!Number.isFinite(monthlySalesGoal) || monthlySalesGoal < 0)) {
    return NextResponse.json({ error: "Meta inválida." }, { status: 422 });
  }

  try {
    await adminAdvisorsService.setSalesGoal(id, monthlySalesGoal);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/advisors]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar la meta." },
      { status: 400 },
    );
  }
}
