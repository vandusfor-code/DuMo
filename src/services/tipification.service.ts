import "server-only";
import { getTipificationRepository } from "@/repositories/tipification.repository";
import type { TenantScope } from "@/lib/tenant-scope";
import type {
  CreateTipificationInput,
  TipificationDeleteCheck,
  TipificationWithUsage,
  UpdateTipificationInput,
} from "@/types/tipification";
import {
  assertTipificationEditable,
  isProtectedTipificationSlug,
  protectedTipificationError,
} from "@/lib/tipification-system";
import { slugifyTipificationName } from "@/lib/tipification-colors";

async function listAllWithUsage(companyId: string): Promise<TipificationWithUsage[]> {
  const repo = getTipificationRepository();
  const items = await repo.listAll(companyId);
  const withUsage = await Promise.all(
    items.map(async (item) => ({
      ...item,
      usageCount: await repo.countUsageBySlug(companyId, item.slug),
    })),
  );
  return withUsage;
}

export const tipificationService = {
  listActive(scope: TenantScope, carrier?: string) {
    return getTipificationRepository().listActive(scope.companyId, carrier);
  },

  listAllWithUsage(scope: TenantScope): Promise<TipificationWithUsage[]> {
    return listAllWithUsage(scope.companyId);
  },

  getBySlug(scope: TenantScope, slug: string) {
    return getTipificationRepository().getBySlug(scope.companyId, slug);
  },

  async triggersSaleFlowForSlug(companyId: string, slug: string): Promise<boolean> {
    const item = await getTipificationRepository().getBySlug(companyId, slug);
    if (item) return item.triggersSaleFlow;
    return slug === "venta";
  },

  create(scope: TenantScope, input: CreateTipificationInput) {
    if (!input.name?.trim()) throw new Error("El nombre es obligatorio.");
    if (!input.badgeBg || !input.badgeText) throw new Error("Selecciona un color.");
    const slug = input.slug?.trim() || slugifyTipificationName(input.name);
    if (isProtectedTipificationSlug(slug)) {
      throw new Error(protectedTipificationError(slug));
    }
    return getTipificationRepository().create(scope.companyId, input, scope.userId);
  },

  async update(scope: TenantScope, id: string, input: UpdateTipificationInput) {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error("El nombre es obligatorio.");
    }
    const repo = getTipificationRepository();
    const current = await repo.getById(scope.companyId, id);
    if (!current) throw new Error("Tipificación no encontrada.");
    assertTipificationEditable(current.slug);
    return repo.update(scope.companyId, id, input);
  },

  async checkDelete(scope: TenantScope, id: string): Promise<TipificationDeleteCheck> {
    const repo = getTipificationRepository();
    const item = await repo.getById(scope.companyId, id);
    if (!item) throw new Error("Tipificación no encontrada.");
    if (isProtectedTipificationSlug(item.slug)) {
      return { usageCount: await repo.countUsageBySlug(scope.companyId, item.slug), canDelete: false };
    }
    const usageCount = await repo.countUsageBySlug(scope.companyId, item.slug);
    return { usageCount, canDelete: usageCount === 0 };
  },

  async delete(scope: TenantScope, id: string, reassignToId?: string) {
    const repo = getTipificationRepository();
    const item = await repo.getById(scope.companyId, id);
    if (!item) throw new Error("Tipificación no encontrada.");
    assertTipificationEditable(item.slug);

    const usageCount = await repo.countUsageBySlug(scope.companyId, item.slug);
    if (usageCount > 0) {
      if (!reassignToId) {
        throw new Error(
          `Esta tipificación está siendo usada por ${usageCount} registro(s). Indica otra tipificación para reasignar.`,
        );
      }
      if (reassignToId === id) {
        throw new Error("Elige una tipificación distinta para reasignar.");
      }
      const target = await repo.getById(scope.companyId, reassignToId);
      if (!target) throw new Error("La tipificación de destino no existe.");
      await repo.reassignSlug(scope.companyId, item.slug, target.slug);
    }

    await repo.delete(scope.companyId, id);
    return { ok: true as const };
  },
};
