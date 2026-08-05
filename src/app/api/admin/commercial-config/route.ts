import { NextResponse, type NextRequest } from "next/server";
import {
  commercialConfigFallback,
  withAdminFallback,
} from "@/lib/admin-api-fallbacks";
import { requireAdminSession } from "@/lib/require-admin";
import { commercialConfigurationService } from "@/services/commercial-configuration.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const data = await withAdminFallback(
    () => commercialConfigurationService.getSnapshot(),
    commercialConfigFallback(),
    "GET /api/admin/commercial-config",
  );
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    if (body.action === "updateSettings") {
      const settings = await commercialConfigurationService.updateSettings(body.settings);
      return NextResponse.json(settings);
    }
    const plan = await commercialConfigurationService.createPlan(body);
    return NextResponse.json(plan);
  } catch (error) {
    console.error("[POST /api/admin/commercial-config]", error);
    const message = error instanceof Error ? error.message : "No se pudo guardar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    const plan = await commercialConfigurationService.updatePlan(body.id, body.plan);
    return NextResponse.json(plan);
  } catch (error) {
    console.error("[PUT /api/admin/commercial-config]", error);
    return NextResponse.json({ error: "No se pudo actualizar el plan." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const body = await request.json();
    if (body.action === "duplicate") {
      const plan = await commercialConfigurationService.duplicatePlan(body.id);
      return NextResponse.json(plan);
    }
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/admin/commercial-config]", error);
    return NextResponse.json({ error: "No se pudo duplicar el plan." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdminSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    await commercialConfigurationService.deletePlan(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/commercial-config]", error);
    return NextResponse.json({ error: "No se pudo eliminar el plan." }, { status: 400 });
  }
}
