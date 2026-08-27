import { NextResponse, type NextRequest } from "next/server";
import { emptyAdminPendientesResult } from "@/lib/admin-api-fallbacks";
import { getAdvisorTenantScope } from "@/lib/tenant-scope";
import { advisorRecuperacionService } from "@/services/advisor-recuperacion.service";
import type {
  AdvisorRecuperacionDateRange,
  AdvisorRecuperacionFilters,
} from "@/types/advisor-recuperacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const VALID_DATE_RANGES: AdvisorRecuperacionDateRange[] = ["all", "today", "next7", "next30"];

function parseFilters(p: URLSearchParams): AdvisorRecuperacionFilters {
  const dateRange = (p.get("dateRange") as AdvisorRecuperacionDateRange | null) ?? "all";
  return {
    search: p.get("search") ?? "",
    type: p.get("type") || "all",
    dateRange: VALID_DATE_RANGES.includes(dateRange) ? dateRange : "all",
    page: Math.max(1, Number(p.get("page")) || 1),
    pageSize: Math.min(100, Math.max(1, Number(p.get("pageSize")) || 10)),
  };
}

export async function GET(request: NextRequest) {
  const scope = await getAdvisorTenantScope();
  if (!scope || scope.role !== "asesora") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const result = await advisorRecuperacionService.list(scope.userId, parseFilters(request.nextUrl.searchParams));
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[GET /api/dashboard/recuperacion]", error);
    return NextResponse.json(emptyAdminPendientesResult(), { status: 200 });
  }
}
