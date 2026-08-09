/** Registro de archivos en Supabase Storage — chat: imágenes y audios. */
export type MediaKind = "image" | "audio";

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

/** Límite de subida de audio en el composer. */
export const MAX_UPLOAD_AUDIO_BYTES = 16 * 1024 * 1024;

/** Límite de envío por WhatsApp Web QR (bridge). */
export const MAX_QR_AUDIO_BYTES = 16 * 1024 * 1024;

export function isSupportedImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isSupportedAudioMime(mimeType: string): boolean {
  const m = mimeType.trim().toLowerCase();
  const base = m.split(";")[0].trim();
  return (
    base === "audio/ogg" ||
    base === "audio/opus" ||
    base === "audio/mpeg" ||
    base === "audio/mp3" ||
    base === "audio/webm"
  );
}

export function assertSupportedImageMime(mimeType: string): void {
  if (!isSupportedImageMime(mimeType)) {
    throw new Error("Solo se permiten imágenes (JPG, PNG, WEBP, HEIC, etc.).");
  }
}

export function assertSupportedAudioMime(mimeType: string): void {
  if (!isSupportedAudioMime(mimeType)) {
    throw new Error("Solo se permiten audios OGG/Opus o MP3.");
  }
}

export function inferAudioMimeFromFileName(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".ogg") || lower.endsWith(".opus")) return "audio/ogg; codecs=opus";
  if (lower.endsWith(".webm")) return "audio/webm";
  return null;
}
