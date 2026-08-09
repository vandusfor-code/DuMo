import { NextResponse, type NextRequest } from "next/server";
import { getTenantScope } from "@/lib/tenant-scope";
import { leadsService } from "@/services/leads.service";
import {
  assertSupportedAudioMime,
  assertSupportedImageMime,
  inferAudioMimeFromFileName,
  isSupportedAudioMime,
  isSupportedImageMime,
  MAX_UPLOAD_AUDIO_BYTES,
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_WHATSAPP_IMAGE_BYTES,
} from "@/types/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function resolveMimeType(file: File): string {
  let mimeType = file.type?.trim() || "";
  if (!mimeType || mimeType === "application/octet-stream") {
    const lower = (file.name || "").toLowerCase();
    if (lower.endsWith(".png")) mimeType = "image/png";
    else if (lower.endsWith(".webp")) mimeType = "image/webp";
    else if (lower.endsWith(".gif")) mimeType = "image/gif";
    else if (lower.endsWith(".mp3")) mimeType = "audio/mpeg";
    else if (lower.endsWith(".ogg") || lower.endsWith(".opus")) mimeType = "audio/ogg; codecs=opus";
    else mimeType = "image/jpeg";
  }
  return mimeType;
}

export async function POST(request: NextRequest) {
  const scope = await getTenantScope();
  if (!scope) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const conversationId = String(form.get("conversationId") ?? "").trim();
    const to = String(form.get("to") ?? "").trim();
    const caption = String(form.get("caption") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
    }
    if (!conversationId || !to) {
      return NextResponse.json({ error: "conversationId y to son obligatorios." }, { status: 422 });
    }

    let mimeType = resolveMimeType(file);
    if (!isSupportedImageMime(mimeType) && !isSupportedAudioMime(mimeType)) {
      const inferred = inferAudioMimeFromFileName(file.name || "");
      if (inferred) mimeType = inferred;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (isSupportedAudioMime(mimeType)) {
      if (file.size > MAX_UPLOAD_AUDIO_BYTES) {
        return NextResponse.json(
          { error: "El audio supera el límite de 16 MB." },
          { status: 422 },
        );
      }
      assertSupportedAudioMime(mimeType);
      const result = await leadsService.sendAudioFromUpload({
        conversationId,
        to,
        fileName: file.name || "audio.ogg",
        mimeType,
        data: buffer,
        companyId: scope.companyId,
        createdBy: scope.userId,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (!isSupportedImageMime(mimeType)) {
      return NextResponse.json(
        { error: "Solo se permiten imágenes (JPG, PNG, WEBP…) o audios (OGG/Opus, MP3)." },
        { status: 422 },
      );
    }
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "La imagen supera el límite de 10 MB." },
        { status: 422 },
      );
    }
    if (file.size > MAX_WHATSAPP_IMAGE_BYTES) {
      return NextResponse.json(
        {
          error:
            "La imagen supera 5 MB (límite de WhatsApp). Comprímela antes de enviar; la compresión automática llegará pronto.",
        },
        { status: 422 },
      );
    }

    assertSupportedImageMime(mimeType);
    const result = await leadsService.sendImageFromUpload({
      conversationId,
      to,
      fileName: file.name || "imagen.jpg",
      mimeType,
      data: buffer,
      caption: caption || undefined,
      companyId: scope.companyId,
      createdBy: scope.userId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[POST /api/whatsapp/send-media]", error);
    const message = error instanceof Error ? error.message : "No se pudo enviar el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
