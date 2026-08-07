"use client";

import { useMemo, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
} from "@/hooks/use-quick-replies";
import type { CreateQuickReplyTemplateInput } from "@/types/quick-reply";

export default function AdminPlantillasPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const { data: categories = [], isLoading: loadingCats } = useQuickReplyCategories();
  const { data: templates = [], isLoading, isError, refetch } = useQuickReplyTemplates({
    q: search,
    categoryId: categoryId || undefined,
  });
  const createCategory = useCreateQuickReplyCategory();
  const createTemplate = useCreateQuickReplyTemplate();
  const deleteTemplate = useDeleteQuickReplyTemplate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => templates.filter((t) => !t.deletedAt), [templates]);

  if (isLoading || loadingCats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o atajo…"
            className="h-10 min-w-[220px] flex-1 rounded-xl border border-line px-4 text-[14px]"
          />
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
          <Button
            variant="secondary"
            onClick={() => {
              const name = window.prompt("Nombre de la categoría");
              if (name?.trim()) createCategory.mutate({ name: name.trim() });
            }}
          >
            Nueva categoría
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Crear plantilla
          </Button>
        </div>
      </Card>

      <div className="grid gap-3">
        {filtered.map((t) => (
          <Card key={t.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {t.favorite ? <Star className="size-4 fill-brand text-brand" /> : null}
                <p className="truncate text-[15px] font-semibold text-ink">{t.name}</p>
                <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-muted">
                  {t.shortcut}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted">
                {t.category?.name ?? "Sin categoría"} · v{t.activeVersion?.versionNumber ?? 1} ·{" "}
                {t.activeVersion?.items?.length ?? 0} ítems
              </p>
            </div>
            <button
              type="button"
              aria-label="Eliminar"
              onClick={() => deleteTemplate.mutate(t.id)}
              className="grid size-9 place-items-center rounded-lg text-danger-ink hover:bg-danger-soft"
            >
              <Trash2 className="size-4" />
            </button>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-[14px] text-muted">
            No hay plantillas. Crea la primera para tus asesoras.
          </Card>
        ) : null}
      </div>

      {dialogOpen ? (
        <QuickCreateDialog
          categories={categories}
          onClose={() => setDialogOpen(false)}
          onSave={async (input) => {
            await createTemplate.mutateAsync(input);
            setDialogOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function QuickCreateDialog({
  categories,
  onClose,
  onSave,
}: {
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSave: (input: CreateQuickReplyTemplateInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [textBody, setTextBody] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="w-full max-w-lg p-6">
        <h3 className="text-[17px] font-semibold text-ink">Nueva plantilla de texto</h3>
        <div className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre"
            className="h-11 w-full rounded-xl border border-line px-4 text-[14px]"
          />
          <input
            value={shortcut}
            onChange={(e) => setShortcut(e.target.value)}
            placeholder="Atajo (/saludo)"
            className="h-11 w-full rounded-xl border border-line px-4 text-[14px]"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-11 w-full rounded-xl border border-line px-4 text-[14px]"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <textarea
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            placeholder="Contenido… Usa {{asesor}} y {{cliente}}"
            className="min-h-[120px] w-full rounded-xl border border-line px-4 py-3 text-[14px]"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={saving || !name.trim() || !shortcut.trim() || !categoryId || !textBody.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({
                  name: name.trim(),
                  shortcut,
                  categoryId,
                  items: [{ sortOrder: 1, itemKind: "text", textBody: textBody.trim() }],
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            Guardar
          </Button>
        </div>
      </Card>
    </div>
  );
}
