import "server-only";
import { getQuickReplyRepository } from "@/repositories/quick-reply.repository";
import type { QuickReplyTemplateFilters } from "@/repositories/quick-reply.repository";
import type {
  CreateQuickReplyCategoryInput,
  CreateQuickReplyTemplateInput,
  UpdateQuickReplyTemplateInput,
} from "@/types/quick-reply";
import { hasCapability } from "@/types/permissions";
import type { TenantScope } from "@/lib/tenant-scope";

function assertCapability(scope: TenantScope, capability: Parameters<typeof hasCapability>[1]): void {
  if (!hasCapability(scope.role, capability)) {
    throw new Error("No tienes permiso para esta acción.");
  }
}

export const quickReplyService = {
  listCategories(scope: TenantScope) {
    return getQuickReplyRepository().listCategories(scope.companyId);
  },

  createCategory(scope: TenantScope, input: CreateQuickReplyCategoryInput) {
    assertCapability(scope, "quick_reply.manage_categories");
    return getQuickReplyRepository().createCategory(scope.companyId, input, scope.userId);
  },

  updateCategory(scope: TenantScope, id: string, input: Partial<CreateQuickReplyCategoryInput>) {
    assertCapability(scope, "quick_reply.manage_categories");
    return getQuickReplyRepository().updateCategory(scope.companyId, id, input);
  },

  listTags(scope: TenantScope) {
    return getQuickReplyRepository().listTags(scope.companyId);
  },

  createTag(scope: TenantScope, name: string) {
    assertCapability(scope, "quick_reply.manage_tags");
    return getQuickReplyRepository().createTag(scope.companyId, name, scope.userId);
  },

  listTemplates(scope: TenantScope, filters?: QuickReplyTemplateFilters) {
    assertCapability(scope, "quick_reply.create");
    return getQuickReplyRepository().listTemplates(scope.companyId, filters);
  },

  getTemplate(scope: TenantScope, id: string, includeVersions?: boolean) {
    assertCapability(scope, "quick_reply.create");
    return getQuickReplyRepository().getTemplate(scope.companyId, id, { includeVersions });
  },

  createTemplate(scope: TenantScope, input: CreateQuickReplyTemplateInput) {
    assertCapability(scope, "quick_reply.create");
    return getQuickReplyRepository().createTemplate(scope.companyId, input, scope.userId);
  },

  updateTemplate(scope: TenantScope, id: string, input: UpdateQuickReplyTemplateInput) {
    assertCapability(scope, "quick_reply.edit");
    return getQuickReplyRepository().updateTemplate(scope.companyId, id, input, scope.userId);
  },

  softDeleteTemplate(scope: TenantScope, id: string) {
    assertCapability(scope, "quick_reply.delete");
    return getQuickReplyRepository().softDeleteTemplate(scope.companyId, id, scope.userId);
  },

  restoreTemplate(scope: TenantScope, id: string) {
    assertCapability(scope, "quick_reply.restore");
    return getQuickReplyRepository().restoreTemplate(scope.companyId, id);
  },

  listVersions(scope: TenantScope, templateId: string) {
    assertCapability(scope, "quick_reply.view_versions");
    return getQuickReplyRepository().listVersions(scope.companyId, templateId);
  },

  revertToVersion(scope: TenantScope, templateId: string, versionId: string) {
    assertCapability(scope, "quick_reply.revert_version");
    return getQuickReplyRepository().revertToVersion(
      scope.companyId,
      templateId,
      versionId,
      scope.userId,
    );
  },

  setFavorite(scope: TenantScope, templateId: string, favorite: boolean) {
    assertCapability(scope, "quick_reply.edit");
    return getQuickReplyRepository().setFavorite(scope.companyId, templateId, favorite);
  },

  /** Plantillas activas para asesoras/supervisores en el chat. */
  listForAdvisor(scope: TenantScope) {
    assertCapability(scope, "quick_reply.use");
    return getQuickReplyRepository().listAdvisorTemplates(scope.companyId);
  },

  trackUsage(scope: TenantScope, templateId: string) {
    assertCapability(scope, "quick_reply.use");
    return getQuickReplyRepository().incrementUsage(scope.companyId, templateId);
  },
};
