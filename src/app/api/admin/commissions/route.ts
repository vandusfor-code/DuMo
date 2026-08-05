import { NextResponse, type NextRequest } from "next/server";
import { commissionService } from "@/services/commission.service";
import type { AdminCommissionFilters, AdminCommissionStatus } from "@/types/admin-commission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseFilters(request: NextRequest): AdminCommissionFilters {
  const p = request.nextUrl.searchParams;
  const now = new Date();
  return {
    month: p.get("month") ?? String(now.getMonth() + 1).padStart(2, "0"),
    year: p.get("year") ?? String(now.getFullYear()),
    advisor: p.get("advisor") ?? "all",
    status: (p.get("status") as AdminCommissionStatus | "all") || "all",
  };
}

export async function GET(request: NextRequest) {
  try {
    const filters = parseFilters(request);
    const advisorId = request.nextUrl.searchParams.get("advisorId");
    if (advisorId) {
      const detail = await commissionService.getDetail(advisorId, filters);
      return NextResponse.json(detail);
    }
    const data = await commissionService.list(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/commissions]", error);
    return NextResponse.json({ error: "No se pudieron cargar las comisiones." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "markPaid") {
      await commissionService.markPaid(body.advisorId, body.filters);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/admin/commissions]", error);
    return NextResponse.json({ error: "No se pudo actualizar la comisión." }, { status: 500 });
  }
}
