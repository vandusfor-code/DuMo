"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Star } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoriesModal } from "@/components/admin/plantillas/categories-modal";
import { CategoryExplorer } from "@/components/admin/plantillas/category-explorer";
import {
  TemplateCard,
  TemplateListRow,
  TemplatesSectionHeader,
  type TemplateSortMode,
  type TemplateViewMode,
} from "@/components/admin/plantillas/template-cards";
import { TemplateFormDialog } from "@/components/admin/plantillas/template-form-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useCreateQuickReplyCategory,
  useCreateQuickReplyTemplate,
  useDeleteQuickReplyTemplate,
  useQuickReplyCategories,
  useQuickReplyTemplates,
  useToggleQuickReplyPin,
  useUpdateQuickReplyTemplate,
} from "@/hooks/use-quick-replies";
import {
  MAX_PINNED_QUICK_REPLIES,
  PINNED_LIMIT_MESSAGE,
} from "@/lib/pinned-quick-replies.constants";
import type { QuickReplyTemplate, UpdateQuickReplyTemplateInput } from "@/types/quick-reply";

function sortTemplates(templates: QuickReplyTemplate[], sortMode: TemplateSortMode) {
  const rows = [...templates];
  if (sortMode === "recent") {
    return rows.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }
  if (sortMode === "name") {
    return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  return rows.sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export default function AdminPlantillasPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [viewMode, setViewMode] = useState<TemplateViewMode>("grid");
  const [sortMode, setSortMode] = useState<TemplateSortMode>("recent");
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReplyTemplate | null>(null);

  const { data: categories = [], isLoading: loadingCats } = useQuickReplyCategories();
  const { data: templates = [], isLoading, isError, refetch } = useQuickReplyTemplates({
    q: search,
  });
  const createCategory = useCreateQuickReplyCategory();
  const createTemplate = useCreateQuickReplyTemplate();
  const updateTemplate = useUpdateQuickReplyTemplate();
  const deleteTemplate = useDeleteQuickReplyTemplate();
  const togglePin = useToggleQuickReplyPin();

  const activeTemplates = useMemo(
    () => templates.filter((t) => !t.deletedAt),
    [templates],
  );

  const countsByCategoryId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const template of activeTemplates) {
      counts[template.categoryId] = (counts[template.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [activeTemplates]);

  const filtered = useMemo(() => {
    const byCategory = categoryId
      ? activeTemplates.filter((t) => t.categoryId === categoryId)
      : activeTemplates;
    return sortTemplates(byCategory, sortMode);
  }, [activeTemplates, categoryId, sortMode]);

  const pinnedCount = activeTemplates.filter((t) => t.favorite).length;

  const handleTogglePin = (template: QuickReplyTemplate) => {
    if (!template.favorite && pinnedCount >= MAX_PINNED_QUICK_REPLIES) {
      window.alert(PINNED_LIMIT_MESSAGE);
      return;
    }
    togglePin.mutate(
      { id: template.id, favorite: !template.favorite },
      {
        onError: (err) => {
          window.alert(err instanceof Error ? err.message : PINNED_LIMIT_MESSAGE);
        },
      },
    );
  };

  if (isLoading || loadingCats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState title="No se pudieron cargar las plantillas" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Plantillas"
        subtitle="Respuestas rápidas reutilizables para WhatsApp — texto, imágenes y secuencias compuestas."
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o atajo…"
              className="h-10 w-full rounded-xl border border-line py-2 pl-10 pr-4 text-[14px]"
            />
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-10 rounded-xl border border-line px-3 text-[14px]"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Crear plantilla
          </Button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted">
          <Star className="size-3.5 shrink-0 text-brand" />
          Atajos fijados en chat:{" "}
          <span className="font-medium text-ink">
            {pinnedCount}/{MAX_PINNED_QUICK_REPLIES}
          </span>
          {pinnedCount >= MAX_PINNED_QUICK_REPLIES ? " — límite alcanzado." : "."}
        </p>
      </Card>

      <CategoryExplorer
        categories={categories}
        countsByCategoryId={countsByCategoryId}
        activeCategoryId={categoryId}
        onSelectCategory={setCategoryId}
        onOpenAllCategories={() => setCategoriesModalOpen(true)}
      />

      <section>
        <TemplatesSectionHeader
          viewMode={viewMode}
          sortMode={sortMode}
          onViewModeChange={setViewMode}
          onSortModeChange={setSortMode}
        />

        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-[14px] text-muted">
            No hay plantillas. Crea la primera para tus asesoras.
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                pinLoading={togglePin.isPending}
                pinAtLimit={pinnedCount >= MAX_PINNED_QUICK_REPLIES}
                onTogglePin={() => handleTogglePin(template)}
                onEdit={() => setEditing(template)}
                onDelete={() => deleteTemplate.mutate(template.id)}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((template) => (
              <TemplateListRow
                key={template.id}
                template={template}
                pinLoading={togglePin.isPending}
                pinAtLimit={pinnedCount >= MAX_PINNED_QUICK_REPLIES}
                onTogglePin={() => handleTogglePin(template)}
                onEdit={() => setEditing(template)}
                onDelete={() => deleteTemplate.mutate(template.id)}
              />
            ))}
          </div>
        )}
      </section>

      <CategoriesModal
        open={categoriesModalOpen}
        categories={categories}
        countsByCategoryId={countsByCategoryId}
        activeCategoryId={categoryId}
        onClose={() => setCategoriesModalOpen(false)}
        onSelectCategory={setCategoryId}
        onCreateCategory={(name) => createCategory.mutate({ name })}
        creating={createCategory.isPending}
      />

      {createOpen ? (
        <TemplateFormDialog
          categories={categories}
          pinnedCount={pinnedCount}
          onClose={() => setCreateOpen(false)}
          onSave={async (input) => {
            await createTemplate.mutateAsync(input);
            setCreateOpen(false);
          }}
        />
      ) : null}

      {editing ? (
        <TemplateFormDialog
          template={editing}
          categories={categories}
          pinnedCount={pinnedCount}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            await updateTemplate.mutateAsync({
              id: editing.id,
              data: input as UpdateQuickReplyTemplateInput,
            });
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
