import { NextResponse, type NextRequest } from "next/server";
import { accountingService } from "@/services/accounting.service";
import type { AccountingFilters } from "@/types/accounting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseFilters(request: NextRequest): AccountingFilters {
  const p = request.nextUrl.searchParams;
  const now = new Date();
  return {
    month: p.get("month") ?? String(now.getMonth() + 1),
    year: p.get("year") ?? String(now.getFullYear()),
  };
}

export async function GET(request: NextRequest) {
  try {
    const data = await accountingService.getOverview(parseFilters(request));
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/accounting]", error);
    return NextResponse.json({ error: "No se pudo cargar contabilidad." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const expense = await accountingService.createExpense(body);
    return NextResponse.json(expense);
  } catch (error) {
    console.error("[POST /api/admin/accounting]", error);
    return NextResponse.json({ error: "No se pudo crear el gasto." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    await accountingService.deleteExpense(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/accounting]", error);
    return NextResponse.json({ error: "No se pudo eliminar el gasto." }, { status: 500 });
  }
}
