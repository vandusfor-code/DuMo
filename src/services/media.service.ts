import "server-only";
import { getMediaRepository } from "@/repositories/media.repository";
import {
  buildChatStoragePath,
  buildTemplateStoragePath,
  extensionFromFileName,
  getStorageBucket,
  isSupabaseStorageConfigured,
  publicUrlForStoragePath,
} from "@/lib/media/storage-config";
import { uploadToSupabaseStorage } from "@/server/media/supabase-storage";
import type { MediaKind, MediaSource } from "@/types/media";
import { inferMediaKindFromMime } from "@/types/quick-reply";

function newAssetId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const mediaService = {
  isConfigured(): boolean {
    return isSupabaseStorageConfigured();
  },

  async uploadTemplateMedia(input: {
    companyId: string;
    categorySlug: string;
    fileName: string;
    mimeType: string;
    data: Buffer;
    createdBy: string;
    source?: MediaSource;
  }) {
    const id = newAssetId();
    const mediaKind = inferMediaKindFromMime(input.mimeType) as MediaKind;
    const storagePath = buildTemplateStoragePath({
      companyId: input.companyId,
      categorySlug: input.categorySlug,
      assetId: id,
      fileName: input.fileName,
    });

    let publicUrl: string;
    if (isSupabaseStorageConfigured()) {
      const uploaded = await uploadToSupabaseStorage({
        path: storagePath,
        data: input.data,
        contentType: input.mimeType,
      });
      publicUrl = uploaded.publicUrl;
    } else {
      publicUrl = publicUrlForStoragePath(storagePath);
    }

    return getMediaRepository().create({
      id,
      companyId: input.companyId,
      bucket: getStorageBucket(),
      storagePath,
      publicUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.data.length,
      mediaKind,
      source: input.source ?? "template_upload",
      createdBy: input.createdBy,
    });
  },

  async uploadChatMedia(input: {
    companyId: string;
    conversationId: string;
    direction: "inbound" | "outbound";
    fileName: string;
    mimeType: string;
    data: Buffer;
    createdBy?: string;
    waMediaId?: string;
  }) {
    const id = newAssetId();
    const ext = extensionFromFileName(input.fileName);
    const mediaKind = inferMediaKindFromMime(input.mimeType) as MediaKind;
    const storagePath = buildChatStoragePath({
      companyId: input.companyId,
      direction: input.direction,
      conversationId: input.conversationId,
      assetId: id,
      extension: ext,
    });

    let publicUrl: string;
    if (isSupabaseStorageConfigured()) {
      const uploaded = await uploadToSupabaseStorage({
        path: storagePath,
        data: input.data,
        contentType: input.mimeType,
      });
      publicUrl = uploaded.publicUrl;
    } else {
      publicUrl = publicUrlForStoragePath(storagePath);
    }

    return getMediaRepository().create({
      id,
      companyId: input.companyId,
      bucket: getStorageBucket(),
      storagePath,
      publicUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.data.length,
      mediaKind,
      source: input.direction === "inbound" ? "whatsapp_inbound" : "chat_outbound",
      waMediaId: input.waMediaId ?? null,
      createdBy: input.createdBy ?? null,
    });
  },

  findById(companyId: string, id: string) {
    return getMediaRepository().findById(companyId, id);
  },

  /** Registra un archivo ya subido (p. ej. bridge QR → Supabase) sin volver a subirlo. */
  async registerExistingChatMedia(input: {
    companyId: string;
    publicUrl: string;
    fileName: string;
    mimeType: string;
    sizeBytes?: number;
    source?: MediaSource;
    waMediaId?: string | null;
    createdBy?: string | null;
  }) {
    const { parseSupabasePublicUrl } = await import("@/lib/media/supabase-public-url");
    const { bucket, storagePath } = parseSupabasePublicUrl(input.publicUrl);
    const id = newAssetId();
    const mediaKind = inferMediaKindFromMime(input.mimeType) as MediaKind;

    return getMediaRepository().create({
      id,
      companyId: input.companyId,
      bucket,
      storagePath,
      publicUrl: input.publicUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes ?? 0,
      mediaKind,
      source: input.source ?? "whatsapp_inbound",
      waMediaId: input.waMediaId ?? null,
      createdBy: input.createdBy ?? null,
    });
  },
};
