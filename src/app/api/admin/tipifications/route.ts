import { NextResponse, type NextRequest } from "next/server";
import { withAdminFallback } from "@/lib/admin-api-fallbacks";
import { requireAdministratorSession } from "@/lib/require-administrator";
import { getTenantScope } from "@/lib/tenant-scope";
import { tipificationService } from "@/services/tipification.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(request: NextRequest) {
  if (!(await requireAdministratorSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const scope = await getTenantScope();
  if (!scope) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  try {
    if (id) {
      const check = await withAdminFallback(
        () => tipificationService.checkDelete(scope, id),
        { usageCount: 0, canDelete: true },
        "GET tipifications delete check",
      );
      return NextResponse.json(check);
    }

    const data = await withAdminFallback(
      () => tipificationService.listAllWithUsage(scope),
      [],
      "GET tipifications",
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/tipifications]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar las tipificaciones." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdministratorSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const scope = await getTenantScope();
    if (!scope) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

    const body = await request.json();
    const item = await tipificationService.create(scope, body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/tipifications]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear la tipificación." },
      { status: 400 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await requireAdministratorSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const scope = await getTenantScope();
    if (!scope) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

    const body = await request.json();
    const { id, data } = body as { id: string; data: Record<string, unknown> };
    if (!id) return NextResponse.json({ error: "Falta id." }, { status: 400 });

    const item = await tipificationService.update(scope, id, data);
    return NextResponse.json(item);
  } catch (error) {
    console.error("[PUT /api/admin/tipifications]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar la tipificación." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdministratorSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const scope = await getTenantScope();
    if (!scope) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    const reassignToId = request.nextUrl.searchParams.get("reassignToId") ?? undefined;
    if (!id) return NextResponse.json({ error: "Falta id." }, { status: 400 });

    const result = await tipificationService.delete(scope, id, reassignToId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[DELETE /api/admin/tipifications]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo eliminar la tipificación." },
      { status: 400 },
    );
  }
}
