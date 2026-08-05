import { NextResponse, type NextRequest } from "next/server";
import {
  emptyAdminSalesResult,
  withAdminFallback,
} from "@/lib/admin-api-fallbacks";
import { requireAdminSession } from "@/lib/require-admin";
import { adminSalesService } from "@/services/admin-sales.service";
import type {
  AdminSaleStatus,
  AdminSaleType,
  AdminSalesFilters,
} from "@/types/admin-sale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const p = request.nextUrl.searchParams;
  const filters: AdminSalesFilters = {
    search: p.get("search") ?? "",
    status: (p.get("status") as AdminSaleStatus | "all") || "all",
    advisor: p.get("advisor") || "all",
    type: (p.get("type") as AdminSaleType | "all") || "all",
    page: Math.max(1, Number(p.get("page")) || 1),
    pageSize: Math.min(100, Math.max(1, Number(p.get("pageSize")) || 10)),
  };

  const result = await withAdminFallback(
    () => adminSalesService.list(filters),
    emptyAdminSalesResult(),
    "GET /api/admin/sales",
  );
  return NextResponse.json(result);
}
