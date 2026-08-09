import { createClient } from "@supabase/supabase-js";
import {
  buildInboundChatStoragePath,
  DEFAULT_COMPANY_ID,
  getStorageBucket,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseStorageConfigured,
} from "./media-config.js";

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let client = null;
/** @type {string | null} */
let bucketReady = null;

function getSupabaseAdmin() {
  if (client) return client;
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error("Supabase Storage no configurado (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

async function ensureStorageBucket() {
  const bucket = getStorageBucket();
  if (bucketReady === bucket) return bucket;

  const supabase = getSupabaseAdmin();
  const { data: existing, error: getError } = await supabase.storage.getBucket(bucket);
  if (existing && !getError) {
    bucketReady = bucket;
    return bucket;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, { public: true });
  if (createError) {
    const msg = createError.message.toLowerCase();
    if (!msg.includes("already") && !msg.includes("exists")) {
      throw new Error(`No se pudo crear bucket "${bucket}": ${createError.message}`);
    }
  }
  bucketReady = bucket;
  return bucket;
}

/**
 * Sube audio entrante QR a Supabase Storage (misma convención de rutas que el CRM).
 * @returns {Promise<{ publicUrl: string, storagePath: string }>}
 */
export async function uploadInboundAudioToSupabase(input) {
  if (!isSupabaseStorageConfigured()) {
    throw new Error("Supabase Storage no configurado.");
  }

  const bucket = await ensureStorageBucket();
  const supabase = getSupabaseAdmin();
  const companyId = input.companyId || DEFAULT_COMPANY_ID;
  const storagePath = buildInboundChatStoragePath({
    companyId,
    phone: input.phone,
    assetId: input.assetId,
    extension: input.extension,
  });

  const body = Buffer.isBuffer(input.data) ? input.data : Buffer.from(input.data);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, body, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Error subiendo audio a Supabase: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
}

export function getSupabaseStorageStatus() {
  return {
    configured: isSupabaseStorageConfigured(),
    bucket: getStorageBucket(),
    url: getSupabaseUrl() ? `${getSupabaseUrl().replace(/\/$/, "")}/storage/v1` : null,
  };
}
