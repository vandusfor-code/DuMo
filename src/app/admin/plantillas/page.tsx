"use client";

import { useMemo, useState } from "react";
import { Pencil, Pin, Plus, Trash2 } from "lucide-react";
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
  useToggleQuickReplyPin,
  useUpdateQuickReplyTemplate,
} from "@/hooks/use-quick-replies";
import type { CreateQuickReplyTemplateInput, QuickReplyTemplate, UpdateQuickReplyTemplateInput } from "@/types/quick-reply";
import { cn } from "@/lib/utils";

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
  const updateTemplate = useUpdateQuickReplyTemplate();
  const deleteTemplate = useDeleteQuickReplyTemplate();
  const togglePin = useToggleQuickReplyPin();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReplyTemplate | null>(null);

  const filtered = useMemo(() => {
    return templates
      .filter((t) => !t.deletedAt)
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return a.name.localeCompare(b.name, "es");
      });
  }, [templates]);

  const pinnedCount = filtered.filter((t) => t.favorite).length;

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
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Crear plantilla
          </Button>
        </div>
        {pinnedCount > 0 ? (
          <p className="mt-3 text-[13px] text-muted">
            {pinnedCount} plantilla{pinnedCount === 1 ? "" : "s"} fijada{pinnedCount === 1 ? "" : "s"} — visible{pinnedCount === 1 ? "" : "s"} arriba del chat en Leads.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-3">
        {filtered.map((t) => (
          <TemplateRow
            key={t.id}
            template={t}
            pinLoading={togglePin.isPending}
            onTogglePin={() =>
              togglePin.mutate({ id: t.id, favorite: !t.favorite })
            }
            onEdit={() => setEditing(t)}
            onDelete={() => deleteTemplate.mutate(t.id)}
          />
        ))}
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-[14px] text-muted">
            No hay plantillas. Crea la primera para tus asesoras.
          </Card>
        ) : null}
      </div>

      {createOpen ? (
        <TemplateFormDialog
          categories={categories}
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
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            await updateTemplate.mutateAsync({ id: editing.id, data: input as UpdateQuickReplyTemplateInput });
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function TemplateRow({
  template,
  pinLoading,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  template: QuickReplyTemplate;
  pinLoading: boolean;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const preview =
    template.activeVersion?.items?.find((i) => i.itemKind === "text")?.textBody?.slice(0, 120) ??
    "";

  return (
    <Card
      className={cn(
        "flex items-start justify-between gap-4 p-4 transition-colors",
        template.favorite && "border-brand/30 bg-brand-soft/20",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-ink">{template.name}</p>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-muted">
            {template.shortcut}
          </span>
          {template.favorite ? (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
              Fijada en chat
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[13px] text-muted">
          {template.category?.name ?? "Sin categoría"} · v{template.activeVersion?.versionNumber ?? 1} ·{" "}
          {template.activeVersion?.items?.length ?? 0} ítems
        </p>
        {preview ? (
          <p className="mt-2 line-clamp-2 text-[13px] text-ink/80">{preview}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={template.favorite ? "Quitar del chat" : "Fijar en chat"}
          title={template.favorite ? "Quitar del chat" : "Fijar en chat"}
          disabled={pinLoading}
          onClick={onTogglePin}
          className={cn(
            "grid size-9 place-items-center rounded-lg transition-colors",
            template.favorite
              ? "bg-brand text-white hover:bg-brand-hover"
              : "text-muted hover:bg-brand-soft hover:text-brand",
          )}
        >
          <Pin className={cn("size-4", template.favorite && "fill-current")} />
        </button>
        <button
          type="button"
          aria-label="Editar"
          title="Editar plantilla"
          onClick={onEdit}
          className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Eliminar"
          onClick={onDelete}
          className="grid size-9 place-items-center rounded-lg text-danger-ink hover:bg-danger-soft"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </Card>
  );
}

function TemplateFormDialog({
  template,
  categories,
  onClose,
  onSave,
}: {
  template?: QuickReplyTemplate;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSave: (input: CreateQuickReplyTemplateInput) => Promise<void>;
}) {
  const isEdit = Boolean(template);
  const firstTextItem = template?.activeVersion?.items?.find((i) => i.itemKind === "text");

  const [name, setName] = useState(template?.name ?? "");
  const [shortcut, setShortcut] = useState(template?.shortcut ?? "");
  const [categoryId, setCategoryId] = useState(template?.categoryId ?? categories[0]?.id ?? "");
  const [textBody, setTextBody] = useState(firstTextItem?.textBody ?? "");
  const [pinInChat, setPinInChat] = useState(template?.favorite ?? true);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="w-full max-w-lg p-6">
        <h3 className="text-[17px] font-semibold text-ink">
          {isEdit ? "Editar plantilla" : "Nueva plantilla de texto"}
        </h3>
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
          <label className="flex cursor-pointer items-center gap-2 text-[14px] text-ink">
            <input
              type="checkbox"
              checked={pinInChat}
              onChange={(e) => setPinInChat(e.target.checked)}
              className="size-4 accent-brand"
            />
            Fijar en el chat
          </label>
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
                  favorite: pinInChat,
                  items: [{ sortOrder: 1, itemKind: "text", textBody: textBody.trim() }],
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            {isEdit ? "Guardar cambios" : "Guardar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
