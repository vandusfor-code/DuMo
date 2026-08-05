import { NextResponse } from "next/server";
import { withAdvisorFallback } from "@/lib/advisor-api-fallbacks";
import { salesService } from "@/services/sales.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sale = await withAdvisorFallback(
    () => salesService.getById(id),
    null,
    "sales-detail",
  );
  if (!sale) {
    return NextResponse.json({ error: "Venta no encontrada." }, { status: 404 });
  }
  return NextResponse.json(sale);
}
