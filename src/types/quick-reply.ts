import type { MediaAsset, MediaKind } from "@/types/media";

export type QuickReplyCategoryStatus = "active" | "inactive";
export type QuickReplyTemplateStatus = "active" | "inactive";
export type QuickReplyVersionStatus = "active" | "archived";
export type QuickReplyItemKind = "text" | "media";

export interface QuickReplyCategory {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  sortOrder: number;
  status: QuickReplyCategoryStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface QuickReplyTag {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  createdAt: string;
  createdBy: string;
}

export interface QuickReplyTemplateItem {
  id: string;
  companyId: string;
  versionId: string;
  sortOrder: number;
  itemKind: QuickReplyItemKind;
  textBody?: string | null;
  mediaAssetId?: string | null;
  caption?: string | null;
  mediaAsset?: MediaAsset | null;
}

export interface QuickReplyTemplateVersion {
  id: string;
  companyId: string;
  templateId: string;
  versionNumber: number;
  status: QuickReplyVersionStatus;
  changeNote?: string | null;
  createdAt: string;
  createdBy: string;
  items?: QuickReplyTemplateItem[];
}

/** Plantilla lógica (familia) con versionado y soft delete. */
export interface QuickReplyTemplate {
  id: string;
  companyId: string;
  categoryId: string;
  name: string;
  shortcut: string;
  status: QuickReplyTemplateStatus;
  favorite: boolean;
  timesUsed: number;
  lastUsedAt?: string | null;
  activeVersionId?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  category?: QuickReplyCategory;
  tags?: QuickReplyTag[];
  activeVersion?: QuickReplyTemplateVersion;
  /** Present when loaded with includeVersions. */
  versions?: QuickReplyTemplateVersion[];
}

/** Vista para asesoras en el chat (solo versión activa). */
export interface AdvisorQuickReplyTemplate {
  id: string;
  name: string;
  shortcut: string;
  favorite: boolean;
  categoryName: string;
  categorySlug: string;
  tags: string[];
  itemCount: number;
  mediaCount: number;
  hasText: boolean;
  /** true = un solo bloque texto → insertar en composer */
  isSingleText: boolean;
  previewText?: string;
  activeVersionId: string;
  items: QuickReplyTemplateItem[];
}

export interface CreateQuickReplyCategoryInput {
  name: string;
  slug?: string;
  sortOrder?: number;
  status?: QuickReplyCategoryStatus;
}

export interface UpsertQuickReplyTemplateItemInput {
  sortOrder: number;
  itemKind: QuickReplyItemKind;
  textBody?: string;
  mediaAssetId?: string;
  caption?: string;
}

export interface CreateQuickReplyTemplateInput {
  categoryId: string;
  name: string;
  shortcut: string;
  status?: QuickReplyTemplateStatus;
  favorite?: boolean;
  tagIds?: string[];
  changeNote?: string;
  items: UpsertQuickReplyTemplateItemInput[];
}

export interface UpdateQuickReplyTemplateInput extends CreateQuickReplyTemplateInput {
  /** Si true, crea nueva versión y archiva la anterior. */
  createNewVersion?: boolean;
}

export function inferMediaKindFromMime(mimeType: string): MediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  throw new Error("Tipo de archivo no soportado en chat.");
}
