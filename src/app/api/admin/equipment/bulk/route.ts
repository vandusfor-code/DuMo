import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { equipmentService } from "@/services/equipment.service";
import type { UpsertEquipmentInput } from "@/types/equipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type BulkImportBody = {
  items: Array<{ rowNumber: number; equipment: UpsertEquipmentInput }>;
};

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = (await request.json()) as BulkImportBody;
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "No hay equipos para importar." }, { status: 400 });
    }

    const result = await equipmentService.bulkCreate(body.items);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/admin/equipment/bulk]", error);
    const message = error instanceof Error ? error.message : "No se pudo importar el catálogo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
