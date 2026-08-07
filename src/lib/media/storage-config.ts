/** Configuración de Supabase Storage (servidor). */

export function getSupabaseUrl(): string | null {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    null
  );
}

export function getSupabaseServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function getStorageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "dumo-media";
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

/** companies/{companyId}/templates/{categorySlug}/{assetId}-{fileName} */
export function buildTemplateStoragePath(input: {
  companyId: string;
  categorySlug: string;
  assetId: string;
  fileName: string;
}): string {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `companies/${input.companyId}/templates/${input.categorySlug}/${input.assetId}-${safeName}`;
}

/** companies/{companyId}/chat/outbound|inbound/{conversationId}/{assetId}.{ext} */
export function buildChatStoragePath(input: {
  companyId: string;
  direction: "inbound" | "outbound";
  conversationId: string;
  assetId: string;
  extension: string;
}): string {
  const ext = input.extension.replace(/^\./, "").toLowerCase() || "bin";
  return `companies/${input.companyId}/chat/${input.direction}/${input.conversationId}/${input.assetId}.${ext}`;
}

export function extensionFromFileName(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "bin") : "bin";
}

export function publicUrlForStoragePath(path: string): string {
  const base = getSupabaseUrl()?.replace(/\/$/, "");
  const bucket = getStorageBucket();
  if (!base) return path;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
