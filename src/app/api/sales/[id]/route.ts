import { NextResponse } from "next/server";
import { advisorScopeFromUser } from "@/lib/advisor-scope";
import { withAdvisorFallback } from "@/lib/advisor-api-fallbacks";
import { authService } from "@/services/auth.service";
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authService.getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const scope = advisorScopeFromUser(user);

  try {
    await salesService.delete(id, scope);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/sales/[id]]", error);
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la venta.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
