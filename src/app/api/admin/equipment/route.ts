import { NextResponse, type NextRequest } from "next/server";
import { withAdminFallback } from "@/lib/admin-api-fallbacks";
import { requireAdminSession } from "@/lib/require-admin";
import { equipmentService } from "@/services/equipment.service";
import { EQUIPMENT_CATALOG_MOCK } from "@/data/mock/equipment.mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const data = await withAdminFallback(
    () => equipmentService.listAll(),
    [...EQUIPMENT_CATALOG_MOCK],
    "GET /api/admin/equipment",
  );
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    const item = await equipmentService.create(body);
    return NextResponse.json(item);
  } catch (error) {
    console.error("[POST /api/admin/equipment]", error);
    const message = error instanceof Error ? error.message : "No se pudo crear el equipo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    const item = await equipmentService.update(body.id, body.equipment);
    return NextResponse.json(item);
  } catch (error) {
    console.error("[PUT /api/admin/equipment]", error);
    return NextResponse.json({ error: "No se pudo actualizar el equipo." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    if (body.action === "setStatus") {
      const item = await equipmentService.setStatus(body.id, body.status);
      return NextResponse.json(item);
    }
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/admin/equipment]", error);
    return NextResponse.json({ error: "No se pudo cambiar el estado." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    await equipmentService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/equipment]", error);
    return NextResponse.json({ error: "No se pudo eliminar el equipo." }, { status: 400 });
  }
}
