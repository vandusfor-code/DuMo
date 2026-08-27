import "server-only";
import type { MediaAsset, MediaKind, MediaSource } from "@/types/media";
import type {
  AdvisorQuickReplyTemplate,
  CreateQuickReplyCategoryInput,
  CreateQuickReplyTemplateInput,
  QuickReplyCategory,
  QuickReplyCategoryStatus,
  QuickReplyTag,
  QuickReplyTemplate,
  QuickReplyTemplateItem,
  QuickReplyTemplateStatus,
  QuickReplyTemplateVersion,
  QuickReplyVersionStatus,
  UpdateQuickReplyTemplateInput,
  UpsertQuickReplyTemplateItemInput,
} from "@/types/quick-reply";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import {
  isSingleTextTemplate,
  normalizeShortcut,
  slugify,
  templatePreviewText,
} from "@/lib/quick-reply-utils";
import { ensureSchema, getSql, hasDatabase, withDbRetry } from "@/server/db/client";
import {
  MAX_PINNED_QUICK_REPLIES,
  PINNED_LIMIT_MESSAGE,
} from "@/lib/pinned-quick-replies.constants";

export interface QuickReplyTemplateFilters {
  search?: string;
  categoryId?: string;
  tagId?: string;
  status?: QuickReplyTemplateStatus;
  includeDeleted?: boolean;
  /** Omitido = todas las plantillas, sin filtrar por operador. */
  carrier?: string;
}

export interface QuickReplyRepository {
  listCategories(companyId: string): Promise<QuickReplyCategory[]>;
  createCategory(
    companyId: string,
    input: CreateQuickReplyCategoryInput,
    createdBy: string,
  ): Promise<QuickReplyCategory>;
  updateCategory(
    companyId: string,
    id: string,
    input: Partial<CreateQuickReplyCategoryInput>,
  ): Promise<QuickReplyCategory>;

  listTags(companyId: string): Promise<QuickReplyTag[]>;
  createTag(companyId: string, name: string, createdBy: string): Promise<QuickReplyTag>;
  findOrCreateTagsByNames(
    companyId: string,
    names: string[],
    createdBy: string,
  ): Promise<QuickReplyTag[]>;

  listTemplates(companyId: string, filters?: QuickReplyTemplateFilters): Promise<QuickReplyTemplate[]>;
  getTemplate(
    companyId: string,
    id: string,
    options?: { includeVersions?: boolean },
  ): Promise<QuickReplyTemplate | null>;
  createTemplate(
    companyId: string,
    input: CreateQuickReplyTemplateInput,
    createdBy: string,
  ): Promise<QuickReplyTemplate>;
  updateTemplate(
    companyId: string,
    id: string,
    input: UpdateQuickReplyTemplateInput,
    updatedBy: string,
  ): Promise<QuickReplyTemplate>;
  softDeleteTemplate(companyId: string, id: string, deletedBy: string): Promise<void>;
  restoreTemplate(companyId: string, id: string): Promise<QuickReplyTemplate>;
  listVersions(companyId: string, templateId: string): Promise<QuickReplyTemplateVersion[]>;
  revertToVersion(
    companyId: string,
    templateId: string,
    versionId: string,
    userId: string,
  ): Promise<QuickReplyTemplate>;
  listAdvisorTemplates(companyId: string): Promise<AdvisorQuickReplyTemplate[]>;
  incrementUsage(companyId: string, templateId: string): Promise<void>;
  setFavorite(companyId: string, templateId: string, favorite: boolean): Promise<void>;
}

function newId(prefix: string): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function countPinnedTemplates(
  templates: { id: string; favorite: boolean }[],
  excludeId?: string,
): number {
  return templates.filter((t) => t.favorite && t.id !== excludeId).length;
}

function assertPinCapacity(pinnedCount: number): void {
  if (pinnedCount >= MAX_PINNED_QUICK_REPLIES) {
    throw new Error(PINNED_LIMIT_MESSAGE);
  }
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("Base de datos no configurada.");
  return sql;
}

function mapMediaRow(r: Record<string, unknown>): MediaAsset {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    bucket: String(r.bucket),
    storagePath: String(r.storage_path),
    publicUrl: String(r.public_url),
    fileName: String(r.file_name),
    mimeType: String(r.mime_type),
    sizeBytes: Number(r.size_bytes) || 0,
    mediaKind: String(r.media_kind) as MediaKind,
    source: String(r.source) as MediaSource,
    waMediaId: r.wa_media_id ? String(r.wa_media_id) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    createdBy: r.created_by ? String(r.created_by) : null,
  };
}

function mapCategoryRow(r: Record<string, unknown>): QuickReplyCategory {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    name: String(r.name),
    slug: String(r.slug),
    sortOrder: Number(r.sort_order) || 0,
    status: (String(r.status) === "inactive" ? "inactive" : "active") as QuickReplyCategoryStatus,
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
    createdBy: String(r.created_by ?? ""),
  };
}

function mapTagRow(r: Record<string, unknown>): QuickReplyTag {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    name: String(r.name),
    slug: String(r.slug),
    createdAt: new Date(String(r.created_at)).toISOString(),
    createdBy: String(r.created_by ?? ""),
  };
}

function mapItemRow(r: Record<string, unknown>, media?: MediaAsset | null): QuickReplyTemplateItem {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    versionId: String(r.version_id),
    sortOrder: Number(r.sort_order) || 0,
    itemKind: String(r.item_kind) === "media" ? "media" : "text",
    textBody: r.text_body != null ? String(r.text_body) : null,
    mediaAssetId: r.media_asset_id ? String(r.media_asset_id) : null,
    caption: r.caption != null ? String(r.caption) : null,
    mediaAsset: media ?? null,
  };
}

function mapVersionRow(r: Record<string, unknown>, items?: QuickReplyTemplateItem[]): QuickReplyTemplateVersion {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    templateId: String(r.template_id),
    versionNumber: Number(r.version_number) || 1,
    status: (String(r.status) === "archived" ? "archived" : "active") as QuickReplyVersionStatus,
    changeNote: r.change_note != null ? String(r.change_note) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    createdBy: String(r.created_by ?? ""),
    items,
  };
}

function mapTemplateRow(r: Record<string, unknown>): QuickReplyTemplate {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    categoryId: String(r.category_id),
    name: String(r.name),
    shortcut: String(r.shortcut),
    carrier: String(r.carrier ?? "wom"),
    status: (String(r.status) === "inactive" ? "inactive" : "active") as QuickReplyTemplateStatus,
    favorite: Boolean(r.favorite),
    timesUsed: Number(r.times_used) || 0,
    lastUsedAt: r.last_used_at ? new Date(String(r.last_used_at)).toISOString() : null,
    activeVersionId: r.active_version_id ? String(r.active_version_id) : null,
    deletedAt: r.deleted_at ? new Date(String(r.deleted_at)).toISOString() : null,
    deletedBy: r.deleted_by ? String(r.deleted_by) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
    createdBy: String(r.created_by ?? ""),
  };
}

function toAdvisorTemplate(
  template: QuickReplyTemplate,
  category: QuickReplyCategory,
  tags: QuickReplyTag[],
  items: QuickReplyTemplateItem[],
): AdvisorQuickReplyTemplate {
  const mediaCount = items.filter((i) => i.itemKind === "media").length;
  const hasText = items.some((i) => i.itemKind === "text" && i.textBody?.trim());
  return {
    id: template.id,
    name: template.name,
    shortcut: template.shortcut,
    favorite: template.favorite,
    categoryName: category.name,
    categorySlug: category.slug,
    tags: tags.map((t) => t.name),
    itemCount: items.length,
    mediaCount,
    hasText,
    isSingleText: isSingleTextTemplate(items),
    previewText: templatePreviewText(items),
    activeVersionId: template.activeVersionId ?? "",
    items,
  };
}

const DEFAULT_MOCK_CATEGORIES: Omit<QuickReplyCategory, "companyId" | "createdAt" | "updatedAt">[] = [
  { id: "qrcat-saludos", name: "Saludos", slug: "saludos", sortOrder: 1, status: "active", createdBy: "system" },
  { id: "qrcat-planes", name: "Planes", slug: "planes", sortOrder: 2, status: "active", createdBy: "system" },
  { id: "qrcat-equipos", name: "Equipos", slug: "equipos", sortOrder: 3, status: "active", createdBy: "system" },
  { id: "qrcat-documentos", name: "Documentos", slug: "documentos", sortOrder: 4, status: "active", createdBy: "system" },
  { id: "qrcat-pagos", name: "Pagos", slug: "pagos", sortOrder: 5, status: "active", createdBy: "system" },
  { id: "qrcat-despedidas", name: "Despedidas", slug: "despedidas", sortOrder: 6, status: "active", createdBy: "system" },
  { id: "qrcat-promociones", name: "Promociones", slug: "promociones", sortOrder: 7, status: "active", createdBy: "system" },
];

interface MockTagLink {
  companyId: string;
  templateId: string;
  tagId: string;
}

const mockStore = {
  categories: DEFAULT_MOCK_CATEGORIES.map((c) => ({
    ...c,
    companyId: DEFAULT_COMPANY_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })) as QuickReplyCategory[],
  tags: [] as QuickReplyTag[],
  templates: [] as QuickReplyTemplate[],
  versions: [] as QuickReplyTemplateVersion[],
  items: [] as QuickReplyTemplateItem[],
  tagLinks: [] as MockTagLink[],
  mediaAssets: new Map<string, MediaAsset>(),
};

function mockNow() {
  return new Date().toISOString();
}

function mockFilterTemplates(companyId: string, filters?: QuickReplyTemplateFilters): QuickReplyTemplate[] {
  const q = filters?.search?.trim().toLowerCase() ?? "";
  return mockStore.templates.filter((t) => {
    if (t.companyId !== companyId) return false;
    if (!filters?.includeDeleted && t.deletedAt) return false;
    if (filters?.categoryId && t.categoryId !== filters.categoryId) return false;
    if (filters?.status && t.status !== filters.status) return false;
    if (filters?.carrier && (t.carrier ?? "wom") !== filters.carrier) return false;
    if (filters?.tagId) {
      const hasTag = mockStore.tagLinks.some(
        (l) => l.companyId === companyId && l.templateId === t.id && l.tagId === filters.tagId,
      );
      if (!hasTag) return false;
    }
    if (q && !t.name.toLowerCase().includes(q) && !t.shortcut.toLowerCase().includes(q)) return false;
    return true;
  });
}

function mockBuildItems(versionId: string): QuickReplyTemplateItem[] {
  return mockStore.items
    .filter((i) => i.versionId === versionId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({
      ...i,
      mediaAsset: i.mediaAssetId ? mockStore.mediaAssets.get(i.mediaAssetId) ?? null : null,
    }));
}

function mockEnrichTemplate(template: QuickReplyTemplate, includeVersions = false): QuickReplyTemplate {
  const category = mockStore.categories.find((c) => c.id === template.categoryId);
  const tagIds = mockStore.tagLinks.filter((l) => l.templateId === template.id).map((l) => l.tagId);
  const tags = mockStore.tags.filter((t) => tagIds.includes(t.id));

  if (includeVersions) {
    const versions = mockStore.versions
      .filter((v) => v.templateId === template.id)
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((v) => ({ ...v, items: mockBuildItems(v.id) }));
    const activeVersion =
      versions.find((v) => v.id === template.activeVersionId) ??
      versions.find((v) => v.status === "active");
    return { ...template, category, tags, activeVersion, versions };
  }

  const activeVersionRow = template.activeVersionId
    ? mockStore.versions.find((v) => v.id === template.activeVersionId)
    : undefined;

  return {
    ...template,
    category,
    tags,
    activeVersion: activeVersionRow
      ? { ...activeVersionRow, items: mockBuildItems(activeVersionRow.id) }
      : undefined,
  };
}

function mockCreateItems(
  companyId: string,
  versionId: string,
  items: UpsertQuickReplyTemplateItemInput[],
): QuickReplyTemplateItem[] {
  return items.map((item) => {
    const row: QuickReplyTemplateItem = {
      id: newId("qritem-"),
      companyId,
      versionId,
      sortOrder: item.sortOrder,
      itemKind: item.itemKind,
      textBody: item.textBody ?? null,
      mediaAssetId: item.mediaAssetId ?? null,
      caption: item.caption ?? null,
      mediaAsset: item.mediaAssetId ? mockStore.mediaAssets.get(item.mediaAssetId) ?? null : null,
    };
    mockStore.items.push(row);
    return row;
  });
}

function mockReplaceTagLinks(companyId: string, templateId: string, tagIds: string[]) {
  mockStore.tagLinks = mockStore.tagLinks.filter((l) => l.templateId !== templateId);
  for (const tagId of tagIds) {
    mockStore.tagLinks.push({ companyId, templateId, tagId });
  }
}

function mockNextVersionNumber(templateId: string): number {
  const nums = mockStore.versions.filter((v) => v.templateId === templateId).map((v) => v.versionNumber);
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

class MockQuickReplyRepository implements QuickReplyRepository {
  listCategories(companyId: string) {
    return Promise.resolve(
      mockStore.categories
        .filter((c) => c.companyId === companyId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    );
  }

  async createCategory(companyId: string, input: CreateQuickReplyCategoryInput, createdBy: string) {
    const now = mockNow();
    const slug = input.slug?.trim() || slugify(input.name);
    if (mockStore.categories.some((c) => c.companyId === companyId && c.slug === slug)) {
      throw new Error("Ya existe una categoría con ese slug.");
    }
    const category: QuickReplyCategory = {
      id: newId("qrcat-"),
      companyId,
      name: input.name.trim(),
      slug,
      sortOrder: input.sortOrder ?? mockStore.categories.filter((c) => c.companyId === companyId).length,
      status: input.status ?? "active",
      createdAt: now,
      updatedAt: now,
      createdBy,
    };
    mockStore.categories.push(category);
    return category;
  }

  async updateCategory(companyId: string, id: string, input: Partial<CreateQuickReplyCategoryInput>) {
    const idx = mockStore.categories.findIndex((c) => c.companyId === companyId && c.id === id);
    if (idx === -1) throw new Error("Categoría no encontrada.");
    const current = mockStore.categories[idx];
    const slug = input.slug?.trim() || (input.name ? slugify(input.name) : current.slug);
    if (
      slug !== current.slug &&
      mockStore.categories.some((c) => c.companyId === companyId && c.slug === slug && c.id !== id)
    ) {
      throw new Error("Ya existe una categoría con ese slug.");
    }
    mockStore.categories[idx] = {
      ...current,
      name: input.name?.trim() ?? current.name,
      slug,
      sortOrder: input.sortOrder ?? current.sortOrder,
      status: input.status ?? current.status,
      updatedAt: mockNow(),
    };
    return mockStore.categories[idx];
  }

  listTags(companyId: string) {
    return Promise.resolve(
      mockStore.tags.filter((t) => t.companyId === companyId).sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  async createTag(companyId: string, name: string, createdBy: string) {
    const slug = slugify(name);
    const existing = mockStore.tags.find((t) => t.companyId === companyId && t.slug === slug);
    if (existing) return existing;
    const tag: QuickReplyTag = {
      id: newId("qrtag-"),
      companyId,
      name: name.trim(),
      slug,
      createdAt: mockNow(),
      createdBy,
    };
    mockStore.tags.push(tag);
    return tag;
  }

  async findOrCreateTagsByNames(companyId: string, names: string[], createdBy: string) {
    const result: QuickReplyTag[] = [];
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      result.push(await this.createTag(companyId, name, createdBy));
    }
    return result;
  }

  async listTemplates(companyId: string, filters?: QuickReplyTemplateFilters) {
    return mockFilterTemplates(companyId, filters)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((t) => mockEnrichTemplate(t));
  }

  async getTemplate(companyId: string, id: string, options?: { includeVersions?: boolean }) {
    const template = mockStore.templates.find((t) => t.companyId === companyId && t.id === id);
    if (!template) return null;
    return mockEnrichTemplate(template, options?.includeVersions);
  }

  async createTemplate(companyId: string, input: CreateQuickReplyTemplateInput, createdBy: string) {
    const category = mockStore.categories.find((c) => c.companyId === companyId && c.id === input.categoryId);
    if (!category) throw new Error("Categoría no encontrada.");
    if (input.favorite) {
      assertPinCapacity(countPinnedTemplates(mockStore.templates.filter((t) => t.companyId === companyId)));
    }

    const now = mockNow();
    const templateId = newId("qrtpl-");
    const versionId = newId("qrv-");
    const shortcut = normalizeShortcut(input.shortcut);

    const template: QuickReplyTemplate = {
      id: templateId,
      companyId,
      categoryId: input.categoryId,
      name: input.name.trim(),
      shortcut,
      carrier: input.carrier ?? "wom",
      status: input.status ?? "active",
      favorite: input.favorite ?? false,
      timesUsed: 0,
      lastUsedAt: null,
      activeVersionId: versionId,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    const version: QuickReplyTemplateVersion = {
      id: versionId,
      companyId,
      templateId,
      versionNumber: 1,
      status: "active",
      changeNote: input.changeNote ?? null,
      createdAt: now,
      createdBy,
    };

    mockStore.templates.push(template);
    mockStore.versions.push(version);
    mockCreateItems(companyId, versionId, input.items);
    mockReplaceTagLinks(companyId, templateId, input.tagIds ?? []);

    return (await this.getTemplate(companyId, templateId))!;
  }

  async updateTemplate(
    companyId: string,
    id: string,
    input: UpdateQuickReplyTemplateInput,
    updatedBy: string,
  ) {
    const template = mockStore.templates.find((t) => t.companyId === companyId && t.id === id);
    if (!template) throw new Error("Plantilla no encontrada.");
    if (template.deletedAt) throw new Error("No se puede editar una plantilla eliminada.");

    const now = mockNow();
    const wasFavorite = template.favorite;
    const nextFavorite = input.favorite ?? wasFavorite;
    if (nextFavorite && !wasFavorite) {
      assertPinCapacity(
        countPinnedTemplates(mockStore.templates.filter((t) => t.companyId === companyId), id),
      );
    }

    template.categoryId = input.categoryId;
    template.name = input.name.trim();
    template.shortcut = normalizeShortcut(input.shortcut);
    template.carrier = input.carrier ?? template.carrier;
    template.status = input.status ?? template.status;
    template.favorite = nextFavorite;
    template.updatedAt = now;

    if (template.activeVersionId) {
      const prev = mockStore.versions.find((v) => v.id === template.activeVersionId);
      if (prev) prev.status = "archived";
    }

    const versionId = newId("qrv-");
    const version: QuickReplyTemplateVersion = {
      id: versionId,
      companyId,
      templateId: id,
      versionNumber: mockNextVersionNumber(id),
      status: "active",
      changeNote: input.changeNote ?? null,
      createdAt: now,
      createdBy: updatedBy,
    };
    mockStore.versions.push(version);
    mockCreateItems(companyId, versionId, input.items);
    template.activeVersionId = versionId;
    mockReplaceTagLinks(companyId, id, input.tagIds ?? []);

    return (await this.getTemplate(companyId, id))!;
  }

  async softDeleteTemplate(companyId: string, id: string, deletedBy: string) {
    const template = mockStore.templates.find((t) => t.companyId === companyId && t.id === id);
    if (!template) throw new Error("Plantilla no encontrada.");
    template.deletedAt = mockNow();
    template.deletedBy = deletedBy;
    template.updatedAt = mockNow();
  }

  async restoreTemplate(companyId: string, id: string) {
    const template = mockStore.templates.find((t) => t.companyId === companyId && t.id === id);
    if (!template) throw new Error("Plantilla no encontrada.");
    template.deletedAt = null;
    template.deletedBy = null;
    template.updatedAt = mockNow();
    return (await this.getTemplate(companyId, id))!;
  }

  async listVersions(companyId: string, templateId: string) {
    return mockStore.versions
      .filter((v) => v.companyId === companyId && v.templateId === templateId)
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((v) => ({
        ...v,
        items: mockStore.items
          .filter((i) => i.versionId === v.id)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }));
  }

  async revertToVersion(companyId: string, templateId: string, versionId: string, userId: string) {
    const template = mockStore.templates.find((t) => t.companyId === companyId && t.id === templateId);
    if (!template) throw new Error("Plantilla no encontrada.");

    const target = mockStore.versions.find(
      (v) => v.companyId === companyId && v.templateId === templateId && v.id === versionId,
    );
    if (!target) throw new Error("Versión no encontrada.");

    const sourceItems = mockStore.items
      .filter((i) => i.versionId === versionId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({
        sortOrder: i.sortOrder,
        itemKind: i.itemKind,
        textBody: i.textBody ?? undefined,
        mediaAssetId: i.mediaAssetId ?? undefined,
        caption: i.caption ?? undefined,
      }));

    if (template.activeVersionId) {
      const prev = mockStore.versions.find((v) => v.id === template.activeVersionId);
      if (prev) prev.status = "archived";
    }

    const now = mockNow();
    const newVersionId = newId("qrv-");
    mockStore.versions.push({
      id: newVersionId,
      companyId,
      templateId,
      versionNumber: mockNextVersionNumber(templateId),
      status: "active",
      changeNote: `Revertido a versión ${target.versionNumber}`,
      createdAt: now,
      createdBy: userId,
    });
    mockCreateItems(companyId, newVersionId, sourceItems);
    template.activeVersionId = newVersionId;
    template.updatedAt = now;

    return (await this.getTemplate(companyId, templateId))!;
  }

  async listAdvisorTemplates(companyId: string) {
    const templates = mockStore.templates.filter(
      (t) => t.companyId === companyId && t.status === "active" && !t.deletedAt && t.activeVersionId,
    );
    const result: AdvisorQuickReplyTemplate[] = [];
    for (const template of templates) {
      const category = mockStore.categories.find((c) => c.id === template.categoryId);
      if (!category) continue;
      const tagIds = mockStore.tagLinks.filter((l) => l.templateId === template.id).map((l) => l.tagId);
      const tags = mockStore.tags.filter((t) => tagIds.includes(t.id));
      const items = mockStore.items
        .filter((i) => i.versionId === template.activeVersionId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => ({
          ...i,
          mediaAsset: i.mediaAssetId ? mockStore.mediaAssets.get(i.mediaAssetId) ?? null : null,
        }));
      result.push(toAdvisorTemplate(template, category, tags, items));
    }
    return result.sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async incrementUsage(companyId: string, templateId: string) {
    const template = mockStore.templates.find((t) => t.companyId === companyId && t.id === templateId);
    if (!template) return;
    template.timesUsed += 1;
    template.lastUsedAt = mockNow();
    template.updatedAt = mockNow();
  }

  async setFavorite(companyId: string, templateId: string, favorite: boolean) {
    const template = mockStore.templates.find((t) => t.companyId === companyId && t.id === templateId);
    if (!template) throw new Error("Plantilla no encontrada.");
    if (favorite && !template.favorite) {
      assertPinCapacity(
        countPinnedTemplates(mockStore.templates.filter((t) => t.companyId === companyId), templateId),
      );
    }
    template.favorite = favorite;
    template.updatedAt = mockNow();
  }
}

class PostgresQuickReplyRepository implements QuickReplyRepository {
  private async loadItemsForVersions(versionIds: string[]): Promise<Map<string, QuickReplyTemplateItem[]>> {
    if (versionIds.length === 0) return new Map();
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql`
        SELECT i.*,
          ma.id AS ma_id, ma.company_id AS ma_company_id, ma.bucket AS ma_bucket,
          ma.storage_path AS ma_storage_path, ma.public_url AS ma_public_url,
          ma.file_name AS ma_file_name, ma.mime_type AS ma_mime_type,
          ma.size_bytes AS ma_size_bytes, ma.media_kind AS ma_media_kind,
          ma.source AS ma_source, ma.wa_media_id AS ma_wa_media_id,
          ma.created_at AS ma_created_at, ma.created_by AS ma_created_by
        FROM quick_reply_template_items i
        LEFT JOIN media_assets ma ON ma.id = i.media_asset_id
        WHERE i.version_id = ANY(${versionIds})
        ORDER BY i.sort_order ASC
      `,
    );

    const map = new Map<string, QuickReplyTemplateItem[]>();
    for (const row of rows as Record<string, unknown>[]) {
      const versionId = String(row.version_id);
      let media: MediaAsset | null = null;
      if (row.ma_id) {
        media = mapMediaRow({
          id: row.ma_id,
          company_id: row.ma_company_id,
          bucket: row.ma_bucket,
          storage_path: row.ma_storage_path,
          public_url: row.ma_public_url,
          file_name: row.ma_file_name,
          mime_type: row.ma_mime_type,
          size_bytes: row.ma_size_bytes,
          media_kind: row.ma_media_kind,
          source: row.ma_source,
          wa_media_id: row.ma_wa_media_id,
          created_at: row.ma_created_at,
          created_by: row.ma_created_by,
        });
      }
      const item = mapItemRow(row, media);
      const list = map.get(versionId) ?? [];
      list.push(item);
      map.set(versionId, list);
    }
    return map;
  }

  private async loadTagsForTemplates(companyId: string, templateIds: string[]): Promise<Map<string, QuickReplyTag[]>> {
    if (templateIds.length === 0) return new Map();
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql`
        SELECT l.template_id, t.*
        FROM quick_reply_template_tag_links l
        INNER JOIN quick_reply_tags t ON t.id = l.tag_id
        WHERE l.company_id = ${companyId}
          AND l.template_id = ANY(${templateIds})
        ORDER BY t.name ASC
      `,
    );
    const map = new Map<string, QuickReplyTag[]>();
    for (const row of rows as Record<string, unknown>[]) {
      const templateId = String(row.template_id);
      const tag = mapTagRow(row);
      const list = map.get(templateId) ?? [];
      list.push(tag);
      map.set(templateId, list);
    }
    return map;
  }

  private async enrichTemplates(
    companyId: string,
    templates: QuickReplyTemplate[],
    options?: { includeVersions?: boolean },
  ): Promise<QuickReplyTemplate[]> {
    if (templates.length === 0) return [];

    await ensureSchema();
    const sql = requireSql();
    const categoryIds = [...new Set(templates.map((t) => t.categoryId))];
    const categoryRows = await withDbRetry(() =>
      sql`
        SELECT * FROM quick_reply_categories
        WHERE company_id = ${companyId} AND id = ANY(${categoryIds})
      `,
    );
    const categoryMap = new Map(
      (categoryRows as Record<string, unknown>[]).map((r) => [String(r.id), mapCategoryRow(r)]),
    );

    const templateIds = templates.map((t) => t.id);
    const tagsMap = await this.loadTagsForTemplates(companyId, templateIds);

    const activeVersionIds = templates.map((t) => t.activeVersionId).filter(Boolean) as string[];
    let allVersionIds = [...activeVersionIds];
    let versionsByTemplate = new Map<string, QuickReplyTemplateVersion[]>();
    const activeVersionMap = new Map<string, QuickReplyTemplateVersion>();

    if (activeVersionIds.length > 0) {
      const activeRows = await withDbRetry(() =>
        sql`
          SELECT * FROM quick_reply_template_versions
          WHERE company_id = ${companyId} AND id = ANY(${activeVersionIds})
        `,
      );
      for (const row of activeRows as Record<string, unknown>[]) {
        activeVersionMap.set(String(row.id), mapVersionRow(row));
      }
    }

    if (options?.includeVersions) {
      const versionRows = await withDbRetry(() =>
        sql`
          SELECT * FROM quick_reply_template_versions
          WHERE company_id = ${companyId} AND template_id = ANY(${templateIds})
          ORDER BY version_number DESC
        `,
      );
      versionsByTemplate = new Map();
      for (const row of versionRows as Record<string, unknown>[]) {
        const version = mapVersionRow(row);
        allVersionIds.push(version.id);
        const list = versionsByTemplate.get(version.templateId) ?? [];
        list.push(version);
        versionsByTemplate.set(version.templateId, list);
      }
    }

    allVersionIds = [...new Set(allVersionIds)];
    const itemsMap = await this.loadItemsForVersions(allVersionIds);

    return templates.map((template) => {
      const base = {
        ...template,
        category: categoryMap.get(template.categoryId),
        tags: tagsMap.get(template.id) ?? [],
      };

      if (options?.includeVersions) {
        const versions = (versionsByTemplate.get(template.id) ?? []).map((v) => ({
          ...v,
          items: itemsMap.get(v.id) ?? [],
        }));
        const activeVersion =
          versions.find((v) => v.id === template.activeVersionId) ??
          versions.find((v) => v.status === "active");
        return { ...base, activeVersion, versions };
      }

      const activeVersion = template.activeVersionId
        ? {
            ...(activeVersionMap.get(template.activeVersionId) ?? {
              id: template.activeVersionId,
              companyId,
              templateId: template.id,
              versionNumber: 0,
              status: "active" as const,
              changeNote: null,
              createdAt: template.updatedAt,
              createdBy: template.createdBy,
            }),
            items: itemsMap.get(template.activeVersionId) ?? [],
          }
        : undefined;

      return { ...base, activeVersion };
    });
  }

  private async insertItems(
    companyId: string,
    versionId: string,
    items: UpsertQuickReplyTemplateItemInput[],
  ) {
    const sql = requireSql();
    for (const item of items) {
      await sql`
        INSERT INTO quick_reply_template_items (
          id, company_id, version_id, sort_order, item_kind, text_body, media_asset_id, caption
        ) VALUES (
          ${newId("qritem-")}, ${companyId}, ${versionId}, ${item.sortOrder},
          ${item.itemKind}, ${item.textBody ?? null}, ${item.mediaAssetId ?? null},
          ${item.caption ?? null}
        )
      `;
    }
  }

  private async replaceTagLinks(companyId: string, templateId: string, tagIds: string[]) {
    const sql = requireSql();
    await sql`
      DELETE FROM quick_reply_template_tag_links
      WHERE company_id = ${companyId} AND template_id = ${templateId}
    `;
    for (const tagId of tagIds) {
      await sql`
        INSERT INTO quick_reply_template_tag_links (company_id, template_id, tag_id)
        VALUES (${companyId}, ${templateId}, ${tagId})
        ON CONFLICT DO NOTHING
      `;
    }
  }

  private async nextVersionNumber(templateId: string): Promise<number> {
    const sql = requireSql();
    const rows = await sql`
      SELECT COALESCE(MAX(version_number), 0)::int AS n
      FROM quick_reply_template_versions
      WHERE template_id = ${templateId}
    `;
    return (Number((rows[0] as { n: number })?.n) || 0) + 1;
  }

  async listCategories(companyId: string) {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql`
        SELECT * FROM quick_reply_categories
        WHERE company_id = ${companyId}
        ORDER BY sort_order ASC, name ASC
      `,
    );
    return (rows as Record<string, unknown>[]).map(mapCategoryRow);
  }

  async createCategory(companyId: string, input: CreateQuickReplyCategoryInput, createdBy: string) {
    await ensureSchema();
    const sql = requireSql();
    const slug = input.slug?.trim() || slugify(input.name);
    const id = newId("qrcat-");
    const now = new Date().toISOString();
    try {
      await withDbRetry(() =>
        sql`
          INSERT INTO quick_reply_categories (
            id, company_id, name, slug, sort_order, status, created_at, updated_at, created_by
          ) VALUES (
            ${id}, ${companyId}, ${input.name.trim()}, ${slug},
            ${input.sortOrder ?? 0}, ${input.status ?? "active"}, ${now}, ${now}, ${createdBy}
          )
        `,
      );
    } catch {
      throw new Error("Ya existe una categoría con ese slug.");
    }
    const rows = await sql`
      SELECT * FROM quick_reply_categories WHERE company_id = ${companyId} AND id = ${id} LIMIT 1
    `;
    return mapCategoryRow(rows[0] as Record<string, unknown>);
  }

  async updateCategory(companyId: string, id: string, input: Partial<CreateQuickReplyCategoryInput>) {
    await ensureSchema();
    const sql = requireSql();
    const existing = await sql`
      SELECT * FROM quick_reply_categories WHERE company_id = ${companyId} AND id = ${id} LIMIT 1
    `;
    if (!existing[0]) throw new Error("Categoría no encontrada.");
    const current = mapCategoryRow(existing[0] as Record<string, unknown>);
    const slug = input.slug?.trim() || (input.name ? slugify(input.name) : current.slug);
    const now = new Date().toISOString();
    try {
      await withDbRetry(() =>
        sql`
          UPDATE quick_reply_categories SET
            name = ${input.name?.trim() ?? current.name},
            slug = ${slug},
            sort_order = ${input.sortOrder ?? current.sortOrder},
            status = ${input.status ?? current.status},
            updated_at = ${now}
          WHERE company_id = ${companyId} AND id = ${id}
        `,
      );
    } catch {
      throw new Error("Ya existe una categoría con ese slug.");
    }
    const rows = await sql`
      SELECT * FROM quick_reply_categories WHERE company_id = ${companyId} AND id = ${id} LIMIT 1
    `;
    return mapCategoryRow(rows[0] as Record<string, unknown>);
  }

  async listTags(companyId: string) {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql`
        SELECT * FROM quick_reply_tags
        WHERE company_id = ${companyId}
        ORDER BY name ASC
      `,
    );
    return (rows as Record<string, unknown>[]).map(mapTagRow);
  }

  async createTag(companyId: string, name: string, createdBy: string) {
    await ensureSchema();
    const sql = requireSql();
    const slug = slugify(name);
    const existing = await sql`
      SELECT * FROM quick_reply_tags
      WHERE company_id = ${companyId} AND slug = ${slug}
      LIMIT 1
    `;
    if (existing[0]) return mapTagRow(existing[0] as Record<string, unknown>);

    const id = newId("qrtag-");
    const now = new Date().toISOString();
    await withDbRetry(() =>
      sql`
        INSERT INTO quick_reply_tags (id, company_id, name, slug, created_at, created_by)
        VALUES (${id}, ${companyId}, ${name.trim()}, ${slug}, ${now}, ${createdBy})
      `,
    );
    const rows = await sql`SELECT * FROM quick_reply_tags WHERE id = ${id} LIMIT 1`;
    return mapTagRow(rows[0] as Record<string, unknown>);
  }

  async findOrCreateTagsByNames(companyId: string, names: string[], createdBy: string) {
    const result: QuickReplyTag[] = [];
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      result.push(await this.createTag(companyId, name, createdBy));
    }
    return result;
  }

  async listTemplates(companyId: string, filters?: QuickReplyTemplateFilters) {
    await ensureSchema();
    const sql = requireSql();
    const search = filters?.search?.trim() ?? "";

    const rows = await withDbRetry(() =>
      sql`
        SELECT DISTINCT t.*
        FROM quick_reply_templates t
        WHERE t.company_id = ${companyId}
        ${filters?.includeDeleted ? sql`` : sql`AND t.deleted_at IS NULL`}
        ${filters?.categoryId ? sql`AND t.category_id = ${filters.categoryId}` : sql``}
        ${filters?.status ? sql`AND t.status = ${filters.status}` : sql``}
        ${filters?.carrier ? sql`AND t.carrier = ${filters.carrier}` : sql``}
        ${filters?.tagId ? sql`
          AND EXISTS (
            SELECT 1 FROM quick_reply_template_tag_links tl
            WHERE tl.template_id = t.id AND tl.tag_id = ${filters.tagId}
          )
        ` : sql``}
        ${search ? sql`
          AND (t.name ILIKE ${`%${search}%`} OR t.shortcut ILIKE ${`%${search}%`})
        ` : sql``}
        ORDER BY t.updated_at DESC
      `,
    );

    const templates = (rows as Record<string, unknown>[]).map(mapTemplateRow);
    return this.enrichTemplates(companyId, templates);
  }

  async getTemplate(companyId: string, id: string, options?: { includeVersions?: boolean }) {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql`
        SELECT * FROM quick_reply_templates
        WHERE company_id = ${companyId} AND id = ${id}
        LIMIT 1
      `,
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const [template] = await this.enrichTemplates(companyId, [mapTemplateRow(row)], options);
    return template ?? null;
  }

  async createTemplate(companyId: string, input: CreateQuickReplyTemplateInput, createdBy: string) {
    await ensureSchema();
    const sql = requireSql();

    const catRows = await sql`
      SELECT id FROM quick_reply_categories
      WHERE company_id = ${companyId} AND id = ${input.categoryId}
      LIMIT 1
    `;
    if (!catRows[0]) throw new Error("Categoría no encontrada.");

    if (input.favorite) {
      const pinnedRows = await sql`
        SELECT COUNT(*)::int AS n FROM quick_reply_templates
        WHERE company_id = ${companyId} AND favorite = true AND deleted_at IS NULL
      `;
      assertPinCapacity(Number((pinnedRows[0] as { n: number })?.n) || 0);
    }

    const templateId = newId("qrtpl-");
    const versionId = newId("qrv-");
    const now = new Date().toISOString();
    const shortcut = normalizeShortcut(input.shortcut);

    await withDbRetry(() =>
      sql.begin(async (tx) => {
        await tx`
          INSERT INTO quick_reply_templates (
            id, company_id, category_id, name, shortcut, carrier, status, favorite,
            times_used, active_version_id, created_at, updated_at, created_by
          ) VALUES (
            ${templateId}, ${companyId}, ${input.categoryId}, ${input.name.trim()},
            ${shortcut}, ${input.carrier ?? "wom"}, ${input.status ?? "active"}, ${input.favorite ?? false},
            ${0}, ${versionId}, ${now}, ${now}, ${createdBy}
          )
        `;
        await tx`
          INSERT INTO quick_reply_template_versions (
            id, company_id, template_id, version_number, status, change_note, created_at, created_by
          ) VALUES (
            ${versionId}, ${companyId}, ${templateId}, ${1}, ${"active"},
            ${input.changeNote ?? null}, ${now}, ${createdBy}
          )
        `;
      }),
    );

    await this.insertItems(companyId, versionId, input.items);
    await this.replaceTagLinks(companyId, templateId, input.tagIds ?? []);

    const created = await this.getTemplate(companyId, templateId);
    if (!created) throw new Error("No se pudo crear la plantilla.");
    return created;
  }

  async updateTemplate(
    companyId: string,
    id: string,
    input: UpdateQuickReplyTemplateInput,
    updatedBy: string,
  ) {
    await ensureSchema();
    const sql = requireSql();
    const existing = await this.getTemplate(companyId, id);
    if (!existing) throw new Error("Plantilla no encontrada.");
    if (existing.deletedAt) throw new Error("No se puede editar una plantilla eliminada.");

    const nextFavorite = input.favorite ?? existing.favorite;
    if (nextFavorite && !existing.favorite) {
      const pinnedRows = await sql`
        SELECT COUNT(*)::int AS n FROM quick_reply_templates
        WHERE company_id = ${companyId} AND favorite = true AND deleted_at IS NULL AND id <> ${id}
      `;
      assertPinCapacity(Number((pinnedRows[0] as { n: number })?.n) || 0);
    }

    const versionId = newId("qrv-");
    const now = new Date().toISOString();
    const shortcut = normalizeShortcut(input.shortcut);
    const versionNumber = await this.nextVersionNumber(id);

    await withDbRetry(() =>
      sql.begin(async (tx) => {
        if (existing.activeVersionId) {
          await tx`
            UPDATE quick_reply_template_versions
            SET status = ${"archived"}
            WHERE id = ${existing.activeVersionId}
          `;
        }
        await tx`
          UPDATE quick_reply_templates SET
            category_id = ${input.categoryId},
            name = ${input.name.trim()},
            shortcut = ${shortcut},
            carrier = ${input.carrier ?? existing.carrier},
            status = ${input.status ?? existing.status},
            favorite = ${input.favorite ?? existing.favorite},
            active_version_id = ${versionId},
            updated_at = ${now}
          WHERE company_id = ${companyId} AND id = ${id}
        `;
        await tx`
          INSERT INTO quick_reply_template_versions (
            id, company_id, template_id, version_number, status, change_note, created_at, created_by
          ) VALUES (
            ${versionId}, ${companyId}, ${id}, ${versionNumber}, ${"active"},
            ${input.changeNote ?? null}, ${now}, ${updatedBy}
          )
        `;
      }),
    );

    await this.insertItems(companyId, versionId, input.items);
    await this.replaceTagLinks(companyId, id, input.tagIds ?? []);

    const updated = await this.getTemplate(companyId, id);
    if (!updated) throw new Error("No se pudo actualizar la plantilla.");
    return updated;
  }

  async softDeleteTemplate(companyId: string, id: string, deletedBy: string) {
    await ensureSchema();
    const sql = requireSql();
    const now = new Date().toISOString();
    const rows = await withDbRetry(() =>
      sql`
        UPDATE quick_reply_templates
        SET deleted_at = ${now}, deleted_by = ${deletedBy}, updated_at = ${now}
        WHERE company_id = ${companyId} AND id = ${id}
        RETURNING id
      `,
    );
    if (!rows[0]) throw new Error("Plantilla no encontrada.");
  }

  async restoreTemplate(companyId: string, id: string) {
    await ensureSchema();
    const sql = requireSql();
    const now = new Date().toISOString();
    const rows = await withDbRetry(() =>
      sql`
        UPDATE quick_reply_templates
        SET deleted_at = NULL, deleted_by = NULL, updated_at = ${now}
        WHERE company_id = ${companyId} AND id = ${id}
        RETURNING id
      `,
    );
    if (!rows[0]) throw new Error("Plantilla no encontrada.");
    const restored = await this.getTemplate(companyId, id);
    if (!restored) throw new Error("Plantilla no encontrada.");
    return restored;
  }

  async listVersions(companyId: string, templateId: string) {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql`
        SELECT * FROM quick_reply_template_versions
        WHERE company_id = ${companyId} AND template_id = ${templateId}
        ORDER BY version_number DESC
      `,
    );
    const versions = (rows as Record<string, unknown>[]).map((r) => mapVersionRow(r));
    const itemsMap = await this.loadItemsForVersions(versions.map((v) => v.id));
    return versions.map((v) => ({ ...v, items: itemsMap.get(v.id) ?? [] }));
  }

  async revertToVersion(companyId: string, templateId: string, versionId: string, userId: string) {
    await ensureSchema();
    const sql = requireSql();
    const existing = await this.getTemplate(companyId, templateId);
    if (!existing) throw new Error("Plantilla no encontrada.");

    const targetRows = await sql`
      SELECT * FROM quick_reply_template_versions
      WHERE company_id = ${companyId} AND template_id = ${templateId} AND id = ${versionId}
      LIMIT 1
    `;
    if (!targetRows[0]) throw new Error("Versión no encontrada.");
    const target = mapVersionRow(targetRows[0] as Record<string, unknown>);

    const sourceItems = await sql`
      SELECT sort_order, item_kind, text_body, media_asset_id, caption
      FROM quick_reply_template_items
      WHERE version_id = ${versionId}
      ORDER BY sort_order ASC
    `;

    const newVersionId = newId("qrv-");
    const now = new Date().toISOString();
    const versionNumber = await this.nextVersionNumber(templateId);

    await withDbRetry(() =>
      sql.begin(async (tx) => {
        if (existing.activeVersionId) {
          await tx`
            UPDATE quick_reply_template_versions
            SET status = ${"archived"}
            WHERE id = ${existing.activeVersionId}
          `;
        }
        await tx`
          UPDATE quick_reply_templates
          SET active_version_id = ${newVersionId}, updated_at = ${now}
          WHERE company_id = ${companyId} AND id = ${templateId}
        `;
        await tx`
          INSERT INTO quick_reply_template_versions (
            id, company_id, template_id, version_number, status, change_note, created_at, created_by
          ) VALUES (
            ${newVersionId}, ${companyId}, ${templateId}, ${versionNumber}, ${"active"},
            ${`Revertido a versión ${target.versionNumber}`}, ${now}, ${userId}
          )
        `;
      }),
    );

    const items: UpsertQuickReplyTemplateItemInput[] = (sourceItems as Record<string, unknown>[]).map((r) => ({
      sortOrder: Number(r.sort_order) || 0,
      itemKind: String(r.item_kind) === "media" ? "media" : "text",
      textBody: r.text_body != null ? String(r.text_body) : undefined,
      mediaAssetId: r.media_asset_id ? String(r.media_asset_id) : undefined,
      caption: r.caption != null ? String(r.caption) : undefined,
    }));
    await this.insertItems(companyId, newVersionId, items);

    const reverted = await this.getTemplate(companyId, templateId);
    if (!reverted) throw new Error("No se pudo revertir la plantilla.");
    return reverted;
  }

  async listAdvisorTemplates(companyId: string) {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql`
        SELECT t.*, c.name AS category_name, c.slug AS category_slug
        FROM quick_reply_templates t
        INNER JOIN quick_reply_categories c ON c.id = t.category_id
        WHERE t.company_id = ${companyId}
          AND t.status = ${"active"}
          AND t.deleted_at IS NULL
          AND t.active_version_id IS NOT NULL
        ORDER BY t.favorite DESC, t.name ASC
      `,
    );

    const templates = (rows as Record<string, unknown>[]).map((r) => ({
      template: mapTemplateRow(r),
      categoryName: String(r.category_name),
      categorySlug: String(r.category_slug),
    }));

    if (templates.length === 0) return [];

    const templateIds = templates.map((t) => t.template.id);
    const versionIds = templates.map((t) => t.template.activeVersionId!).filter(Boolean);
    const tagsMap = await this.loadTagsForTemplates(companyId, templateIds);
    const itemsMap = await this.loadItemsForVersions(versionIds);

    return templates.map(({ template, categoryName, categorySlug }) => {
      const items = itemsMap.get(template.activeVersionId!) ?? [];
      const tags = tagsMap.get(template.id) ?? [];
      const category = {
        id: template.categoryId,
        companyId,
        name: categoryName,
        slug: categorySlug,
        sortOrder: 0,
        status: "active" as const,
        createdAt: "",
        updatedAt: "",
        createdBy: "",
      };
      return toAdvisorTemplate(template, category, tags, items);
    });
  }

  async incrementUsage(companyId: string, templateId: string) {
    await ensureSchema();
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE quick_reply_templates
        SET times_used = times_used + 1, last_used_at = now(), updated_at = now()
        WHERE company_id = ${companyId} AND id = ${templateId}
      `,
    );
  }

  async setFavorite(companyId: string, templateId: string, favorite: boolean) {
    await ensureSchema();
    const sql = requireSql();

    if (favorite) {
      const rows = await sql`
        SELECT favorite FROM quick_reply_templates
        WHERE company_id = ${companyId} AND id = ${templateId}
        LIMIT 1
      `;
      const current = rows[0] as { favorite: boolean } | undefined;
      if (!current) throw new Error("Plantilla no encontrada.");
      if (!current.favorite) {
        const pinnedRows = await sql`
          SELECT COUNT(*)::int AS n FROM quick_reply_templates
          WHERE company_id = ${companyId} AND favorite = true AND deleted_at IS NULL AND id <> ${templateId}
        `;
        assertPinCapacity(Number((pinnedRows[0] as { n: number })?.n) || 0);
      }
    }

    const rows = await withDbRetry(() =>
      sql`
        UPDATE quick_reply_templates
        SET favorite = ${favorite}, updated_at = now()
        WHERE company_id = ${companyId} AND id = ${templateId}
        RETURNING id
      `,
    );
    if (!rows[0]) throw new Error("Plantilla no encontrada.");
  }
}

export function getQuickReplyRepository(): QuickReplyRepository {
  return hasDatabase() ? new PostgresQuickReplyRepository() : new MockQuickReplyRepository();
}
