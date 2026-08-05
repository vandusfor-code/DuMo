import { NextResponse, type NextRequest } from "next/server";
import { adminSalesService } from "@/services/admin-sales.service";
import type {
  AdminSaleStatus,
  AdminSaleType,
  AdminSalesFilters,
} from "@/types/admin-sale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const filters: AdminSalesFilters = {
    search: p.get("search") ?? "",
    status: (p.get("status") as AdminSaleStatus | "all") || "all",
    advisor: p.get("advisor") || "all",
    type: (p.get("type") as AdminSaleType | "all") || "all",
    page: Math.max(1, Number(p.get("page")) || 1),
    pageSize: Math.min(100, Math.max(1, Number(p.get("pageSize")) || 10)),
  };
  try {
    const result = await adminSalesService.list(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/admin/sales]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las ventas." },
      { status: 500 },
    );
  }
}
