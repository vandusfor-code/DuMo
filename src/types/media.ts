/** Registro de archivos en Supabase Storage — DuMo solo maneja imágenes. */
export type MediaKind = "image";

export type MediaSource = "template_upload" | "chat_outbound" | "whatsapp_inbound";

export interface MediaAsset {
  id: string;
  companyId: string;
  bucket: string;
  storagePath: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  mediaKind: MediaKind;
  source: MediaSource;
  waMediaId?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

/** WhatsApp Cloud API: imágenes hasta 5 MB vía enlace. */
export const MAX_WHATSAPP_IMAGE_BYTES = 5 * 1024 * 1024;

/** Límite de subida en el composer (antes de compresión futura). */
export const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024;

export function isSupportedImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function assertSupportedImageMime(mimeType: string): void {
  if (!isSupportedImageMime(mimeType)) {
    throw new Error("Solo se permiten imágenes (JPG, PNG, WEBP, HEIC, etc.).");
  }
}
