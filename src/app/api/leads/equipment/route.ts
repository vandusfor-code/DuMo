import { NextResponse } from "next/server";
import { EQUIPMENT_CATALOG_MOCK } from "@/data/mock/equipment.mock";
import { equipmentService } from "@/services/equipment.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Catálogo de equipos activos para Gestión (asesora). */
export async function GET() {
  try {
    const items = await equipmentService.listActive();
    return NextResponse.json(items, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[GET /api/leads/equipment]", error);
    return NextResponse.json(
      EQUIPMENT_CATALOG_MOCK.filter((e) => e.status === "active").map(
        ({ id, commercialName, brand, model, totalValue, downPayment, installmentsCount, installmentValue, commercialText }) => ({
          id,
          commercialName,
          brand,
          model,
          totalValue,
          downPayment,
          installmentsCount,
          installmentValue,
          commercialText,
        }),
      ),
    );
  }
}
