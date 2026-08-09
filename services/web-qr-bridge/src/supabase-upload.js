import {
  buildInboundChatStoragePath,
  DEFAULT_COMPANY_ID,
  getStorageBucket,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseStorageConfigured,
} from "./media-config.js";

/**
 * Sube audio entrante QR a Supabase Storage vía REST (sin supabase-js — compatible Node 20).
 * @returns {Promise<{ publicUrl: string, storagePath: string }>}
 */
export async function uploadInboundAudioToSupabase(input) {
  if (!isSupabaseStorageConfigured()) {
    throw new Error("Supabase Storage no configurado.");
  }

  const baseUrl = getSupabaseUrl().replace(/\/$/, "");
  const key = getSupabaseServiceRoleKey();
  const bucket = getStorageBucket();
  const companyId = input.companyId || DEFAULT_COMPANY_ID;
  const storagePath = buildInboundChatStoragePath({
    companyId,
    phone: input.phone,
    assetId: input.assetId,
    extension: input.extension,
  });

  const body = Buffer.isBuffer(input.data) ? input.data : Buffer.from(input.data);
  const uploadUrl = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": input.contentType,
      "x-upsert": "false",
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Error subiendo audio a Supabase (${res.status}): ${detail.slice(0, 200) || res.statusText}`,
    );
  }

  const publicUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  return { publicUrl, storagePath };
}

export function getSupabaseStorageStatus() {
  return {
    configured: isSupabaseStorageConfigured(),
    bucket: getStorageBucket(),
    url: getSupabaseUrl() ? `${getSupabaseUrl().replace(/\/$/, "")}/storage/v1` : null,
  };
}
