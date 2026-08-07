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

const VALID_STATUSES: AdminSaleStatus[] = [
  "registrada",
  "en_reparto",
  "finalizada",
  "rechazada",
  "cancelada",
];

function parseFilters(p: URLSearchParams): AdminSalesFilters {
  return {
    search: p.get("search") ?? "",
    status: (p.get("status") as AdminSaleStatus | "all") || "all",
    advisor: p.get("advisor") || "all",
    type: (p.get("type") as AdminSaleType | "all") || "all",
    dateFrom: p.get("dateFrom") || undefined,
    dateTo: p.get("dateTo") || undefined,
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
    () => adminSalesService.list(parseFilters(request.nextUrl.searchParams)),
    emptyAdminSalesResult(),
    "GET /api/admin/sales",
  );
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    if (body.action !== "setStatus") {
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }

    const status = body.status as AdminSaleStatus;
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
    }

    const ids: string[] = Array.isArray(body.ids)
      ? body.ids
      : body.id
        ? [body.id]
        : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "IDs requeridos." }, { status: 400 });
    }

    await adminSalesService.updateStatuses(ids, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/sales]", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el estado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const p = request.nextUrl.searchParams;
    const idsParam = p.get("ids") ?? p.get("id");
    if (!idsParam) {
      return NextResponse.json({ error: "IDs requeridos." }, { status: 400 });
    }

    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: "IDs requeridos." }, { status: 400 });
    }

    await adminSalesService.deleteSales(ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/sales]", error);
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la venta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
