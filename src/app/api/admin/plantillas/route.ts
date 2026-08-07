import { NextResponse, type NextRequest } from "next/server";
import { withAdminFallback } from "@/lib/admin-api-fallbacks";
import { requireAdministratorSession } from "@/lib/require-administrator";
import { getTenantScope } from "@/lib/tenant-scope";
import { quickReplyService } from "@/services/quick-reply.service";
import type { QuickReplyTemplateFilters } from "@/repositories/quick-reply.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(request: NextRequest) {
  if (!(await requireAdministratorSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const scope = await getTenantScope();
  if (!scope) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const p = request.nextUrl.searchParams;
  const section = p.get("section");

  try {
    if (section === "categories") {
      const data = await withAdminFallback(
        () => quickReplyService.listCategories(scope),
        [],
        "GET plantillas categories",
      );
      return NextResponse.json(data);
    }
    if (section === "tags") {
      const data = await withAdminFallback(
        () => quickReplyService.listTags(scope),
        [],
        "GET plantillas tags",
      );
      return NextResponse.json(data);
    }

    const filters: QuickReplyTemplateFilters = {
      search: p.get("q") ?? undefined,
      categoryId: p.get("categoryId") ?? undefined,
      tagId: p.get("tagId") ?? undefined,
      status: (p.get("status") as QuickReplyTemplateFilters["status"]) ?? undefined,
      includeDeleted: p.get("includeDeleted") === "1",
    };
    const data = await withAdminFallback(
      () => quickReplyService.listTemplates(scope, filters),
      [],
      "GET plantillas",
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/plantillas]", error);
    return NextResponse.json({ error: "No se pudieron cargar las plantillas." }, { status: 500 });
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

    if (body.section === "category") {
      const item = await quickReplyService.createCategory(scope, body.data);
      return NextResponse.json(item, { status: 201 });
    }
    if (body.section === "tag") {
      const item = await quickReplyService.createTag(scope, String(body.name ?? ""));
      return NextResponse.json(item, { status: 201 });
    }

    const item = await quickReplyService.createTemplate(scope, body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/plantillas]", error);
    const message = error instanceof Error ? error.message : "No se pudo crear.";
    return NextResponse.json({ error: message }, { status: 400 });
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
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    if (body.action === "restore") {
      const item = await quickReplyService.restoreTemplate(scope, id);
      return NextResponse.json(item);
    }
    if (body.action === "favorite") {
      const item = await quickReplyService.setFavorite(scope, id, Boolean(body.favorite));
      return NextResponse.json(item);
    }
    if (body.action === "revert") {
      const item = await quickReplyService.revertToVersion(scope, id, String(body.versionId));
      return NextResponse.json(item);
    }

    const item = await quickReplyService.updateTemplate(scope, id, body.data ?? body);
    return NextResponse.json(item);
  } catch (error) {
    console.error("[PUT /api/admin/plantillas]", error);
    const message = error instanceof Error ? error.message : "No se pudo actualizar.";
    return NextResponse.json({ error: message }, { status: 400 });
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
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    await quickReplyService.softDeleteTemplate(scope, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/plantillas]", error);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdministratorSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const scope = await getTenantScope();
    if (!scope) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

    const body = await request.json();
    const id = String(body.id ?? "");
    if (body.action === "category") {
      const item = await quickReplyService.updateCategory(scope, id, body.data);
      return NextResponse.json(item);
    }
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("[PATCH /api/admin/plantillas]", error);
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 400 });
  }
}
