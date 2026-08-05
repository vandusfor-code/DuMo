import { NextResponse, type NextRequest } from "next/server";
import {
  emptyAccountingResult,
  withAdminFallback,
} from "@/lib/admin-api-fallbacks";
import { requireAdminSession } from "@/lib/require-admin";
import { accountingService } from "@/services/accounting.service";
import type { AccountingFilters } from "@/types/accounting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

function parseFilters(request: NextRequest): AccountingFilters {
  const p = request.nextUrl.searchParams;
  const now = new Date();
  return {
    month: p.get("month") ?? String(now.getMonth() + 1),
    year: p.get("year") ?? String(now.getFullYear()),
  };
}

export async function GET(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const data = await withAdminFallback(
    () => accountingService.getOverview(parseFilters(request)),
    emptyAccountingResult(),
    "GET /api/admin/accounting",
  );
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    const expense = await accountingService.createExpense(body);
    return NextResponse.json(expense);
  } catch (error) {
    console.error("[POST /api/admin/accounting]", error);
    const message = error instanceof Error ? error.message : "No se pudo crear el gasto.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    await accountingService.deleteExpense(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/accounting]", error);
    const message = error instanceof Error ? error.message : "No se pudo eliminar el gasto.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
