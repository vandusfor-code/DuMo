import { NextResponse, type NextRequest } from "next/server";
import { emptyAdminPendientesResult, withAdminFallback } from "@/lib/admin-api-fallbacks";
import { requireAdminSession } from "@/lib/require-admin";
import { adminPendientesService } from "@/services/admin-pendientes.service";
import type {
  AdminPendientesDateRange,
  AdminPendientesFilters,
} from "@/types/admin-pendientes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const VALID_DATE_RANGES: AdminPendientesDateRange[] = ["all", "today", "next7", "next30"];

function parseFilters(p: URLSearchParams): AdminPendientesFilters {
  const dateRange = (p.get("dateRange") as AdminPendientesDateRange | null) ?? "all";
  return {
    search: p.get("search") ?? "",
    type: p.get("type") || "all",
    advisor: p.get("advisor") || "all",
    dateRange: VALID_DATE_RANGES.includes(dateRange) ? dateRange : "all",
    page: Math.max(1, Number(p.get("page")) || 1),
    pageSize: Math.min(100, Math.max(1, Number(p.get("pageSize")) || 10)),
  };
}

export async function GET(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const result = await withAdminFallback(
    () => adminPendientesService.list(parseFilters(request.nextUrl.searchParams)),
    emptyAdminPendientesResult(),
    "GET /api/admin/pendientes",
  );
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await request.json();
    if (body.action !== "transfer") {
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }

    const pendienteId = String(body.id ?? body.pendienteId ?? "").trim();
    const advisorId = String(body.advisorId ?? "").trim();
    if (!pendienteId || !advisorId) {
      return NextResponse.json({ error: "ID de pendiente y asesora requeridos." }, { status: 400 });
    }

    await adminPendientesService.transfer({ pendienteId, advisorId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/pendientes]", error);
    const message =
      error instanceof Error ? error.message : "No se pudo transferir el pendiente.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
