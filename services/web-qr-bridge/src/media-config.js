/** Límites y rutas de media entrante QR (audio — Fase A). */

export const DEFAULT_COMPANY_ID = process.env.DUMO_COMPANY_ID?.trim() || "company-default";

/** Máximo audio entrante (16 MB). */
export const MAX_INBOUND_AUDIO_BYTES = 16 * 1024 * 1024;

/** Máximo imagen entrante (5 MB — límite WhatsApp). */
export const MAX_INBOUND_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_INBOUND_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const ALLOWED_INBOUND_AUDIO_MIMES = new Set([
  "audio/ogg",
  "audio/ogg; codecs=opus",
  "audio/opus",
  "audio/mpeg",
  "audio/mp3",
  "audio/webm",
]);

export function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  );
}

export function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

export function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "dumo-media";
}

export function isSupabaseStorageConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export function webQrConversationId(phoneDigits) {
  const digits = String(phoneDigits ?? "").replace(/\D/g, "");
  return `webqr:${digits}`;
}

/** companies/{companyId}/chat/inbound/{conversationId}/{assetId}.{ext} */
export function buildInboundChatStoragePath(input) {
  const ext = String(input.extension ?? "bin").replace(/^\./, "").toLowerCase() || "bin";
  const conversationId = webQrConversationId(input.phone);
  return `companies/${input.companyId}/chat/inbound/${conversationId}/${input.assetId}.${ext}`;
}

export function newMediaAssetId() {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeInboundAudioMime(rawMime, ptt) {
  const raw = String(rawMime ?? "").trim().toLowerCase();
  const base = raw.split(";")[0].trim();

  if (base === "audio/ogg" || base === "audio/opus") {
    return ptt ? "audio/ogg; codecs=opus" : "audio/ogg";
  }
  if (base === "audio/mpeg" || base === "audio/mp3") {
    return "audio/mpeg";
  }
  if (base === "audio/webm") {
    return "audio/webm";
  }
  if (ptt) {
    return "audio/ogg; codecs=opus";
  }
  if (raw && ALLOWED_INBOUND_AUDIO_MIMES.has(raw)) {
    return raw;
  }
  if (raw && ALLOWED_INBOUND_AUDIO_MIMES.has(base)) {
    return base;
  }
  return "";
}

export function extensionFromAudioMime(mimeType) {
  const m = String(mimeType ?? "").toLowerCase();
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  if (m.includes("webm")) return "webm";
  return "bin";
}

export function normalizeInboundImageMime(rawMime) {
  const raw = String(rawMime ?? "").trim().toLowerCase();
  const base = raw.split(";")[0].trim();
  if (ALLOWED_INBOUND_IMAGE_MIMES.has(base)) return base;
  if (base === "image/jpg") return "image/jpeg";
  return "";
}

export function extensionFromImageMime(mimeType) {
  const m = String(mimeType ?? "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "jpg";
}

export function assertAllowedInboundImageMime(rawMime) {
  const candidate = normalizeInboundImageMime(rawMime);
  if (!candidate) {
    throw new Error(
      `Formato de imagen no compatible (${rawMime || "desconocido"}). Usa JPG, PNG o WEBP.`,
    );
  }
  return candidate;
}

export function assertAllowedInboundAudioMime(rawMime, ptt) {
  const candidate = normalizeInboundAudioMime(rawMime, ptt);
  if (!candidate) {
    throw new Error(
      `Formato de audio no compatible (${rawMime || "desconocido"}). Usa OGG/Opus o MP3.`,
    );
  }
  const base = candidate.split(";")[0].trim();
  const allowed =
    ALLOWED_INBOUND_AUDIO_MIMES.has(candidate) ||
    ALLOWED_INBOUND_AUDIO_MIMES.has(base) ||
    base === "audio/ogg" ||
    base === "audio/mpeg";
  if (!allowed) {
    throw new Error(`Formato de audio no compatible (${rawMime}). Usa OGG/Opus o MP3.`);
  }
  return candidate;
}
