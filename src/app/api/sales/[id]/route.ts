import { NextResponse } from "next/server";
import { salesService } from "@/services/sales.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const sale = await salesService.getById(id);
    if (!sale) {
      return NextResponse.json(
        { error: "Venta no encontrada." },
        { status: 404 },
      );
    }
    return NextResponse.json(sale);
  } catch (error) {
    console.error(`[GET /api/sales/${id}]`, error);
    return NextResponse.json(
      { error: "No se pudo cargar la venta." },
      { status: 500 },
    );
  }
}
