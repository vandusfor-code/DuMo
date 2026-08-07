import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getStorageBucket,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseStorageConfigured,
} from "@/lib/media/storage-config";

let client: SupabaseClient | null = null;
let bucketReady: string | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "Supabase Storage no configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Crea el bucket de chat si aún no existe (prod suele no tenerlo creado a mano). */
async function ensureStorageBucket(): Promise<void> {
  const bucket = getStorageBucket();
  if (bucketReady === bucket) return;

  const supabase = getSupabaseAdmin();
  const { data: existing, error: getError } = await supabase.storage.getBucket(bucket);
  if (existing && !getError) {
    bucketReady = bucket;
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
  });
  if (createError) {
    const msg = createError.message.toLowerCase();
    if (!msg.includes("already") && !msg.includes("exists")) {
      throw new Error(`No se pudo crear el bucket "${bucket}": ${createError.message}`);
    }
  }
  bucketReady = bucket;
}

export async function uploadToSupabaseStorage(input: {
  path: string;
  data: Buffer | Uint8Array | ArrayBuffer;
  contentType: string;
  upsert?: boolean;
}): Promise<{ publicUrl: string; path: string }> {
  if (!isSupabaseStorageConfigured()) {
    throw new Error("Supabase Storage no está configurado.");
  }

  const bucket = getStorageBucket();
  const supabase = getSupabaseAdmin();
  await ensureStorageBucket();
  const body = input.data instanceof Buffer ? input.data : Buffer.from(input.data as ArrayBuffer);

  const { error } = await supabase.storage.from(bucket).upload(input.path, body, {
    contentType: input.contentType,
    upsert: input.upsert ?? false,
  });

  if (error) {
    throw new Error(`Error subiendo archivo: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(input.path);
  return { publicUrl: data.publicUrl, path: input.path };
}

export async function downloadUrlToBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo descargar el archivo (${res.status}).`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

export async function deleteFromSupabaseStorage(path: string): Promise<void> {
  if (!isSupabaseStorageConfigured()) return;
  const supabase = getSupabaseAdmin();
  const bucket = getStorageBucket();
  await supabase.storage.from(bucket).remove([path]);
}
