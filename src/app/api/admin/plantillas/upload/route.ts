import { NextResponse, type NextRequest } from "next/server";
import { requireAdministratorSession } from "@/lib/require-administrator";
import { getTenantScope } from "@/lib/tenant-scope";
import { mediaService } from "@/services/media.service";
import { getQuickReplyRepository } from "@/repositories/quick-reply.repository";
import { isSupportedImageMime, MAX_UPLOAD_IMAGE_BYTES } from "@/types/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdministratorSession())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const scope = await getTenantScope();
    if (!scope) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    const categoryId = String(form.get("categoryId") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: "Categoría requerida." }, { status: 400 });
    }

    const categories = await getQuickReplyRepository().listCategories(scope.companyId);
    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!isSupportedImageMime(mimeType)) {
      return NextResponse.json(
        { error: "Las plantillas solo admiten imágenes (JPG, PNG, WEBP, HEIC, etc.)." },
        { status: 422 },
      );
    }
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      return NextResponse.json({ error: "La imagen supera el límite de 10 MB." }, { status: 422 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await mediaService.uploadTemplateMedia({
      companyId: scope.companyId,
      categorySlug: category.slug,
      fileName: file.name,
      mimeType,
      data: buffer,
      createdBy: scope.userId,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/plantillas/upload]", error);
    const message = error instanceof Error ? error.message : "No se pudo subir el archivo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
