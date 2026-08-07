import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { adminSalesService } from "@/services/admin-sales.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const sale = await adminSalesService.getById(id);
  if (!sale) {
    return NextResponse.json({ error: "Venta no encontrada." }, { status: 404 });
  }
  return NextResponse.json(sale);
}
