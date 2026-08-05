import { NextResponse, type NextRequest } from "next/server";
import {
  emptyAdminCommissionsResult,
  withAdminFallback,
} from "@/lib/admin-api-fallbacks";
import { requireAdminSession } from "@/lib/require-admin";
import { commissionService } from "@/services/commission.service";
import type { AdminCommissionFilters, AdminCommissionStatus } from "@/types/admin-commission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

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
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const filters = parseFilters(request);
  const advisorId = request.nextUrl.searchParams.get("advisorId");

  if (advisorId) {
    const detail = await withAdminFallback(
      () => commissionService.getDetail(advisorId, filters),
      {
        advisor: {
          id: advisorId,
          name: "",
          registeredSales: 0,
          finalizedSales: 0,
          calculatedCommission: 0,
          status: "pending" as const,
          paymentDate: null,
        },
        sales: [],
        totalCommission: 0,
        calculatedAt: new Date().toISOString(),
        paymentHistory: [],
      },
      "GET /api/admin/commissions detail",
    );
    return NextResponse.json(detail);
  }

  const data = await withAdminFallback(
    () => commissionService.list(filters),
    emptyAdminCommissionsResult(),
    "GET /api/admin/commissions",
  );
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    if (body.action === "markPaid") {
      await commissionService.markPaid(body.advisorId, body.filters);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/admin/commissions]", error);
    const message = error instanceof Error ? error.message : "No se pudo actualizar la comisión.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
