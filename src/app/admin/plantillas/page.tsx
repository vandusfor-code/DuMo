"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Loader2, Pencil, Pin, Plus, Trash2, Upload, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  useCreateQuickReplyCategory,
  useCreateQuickReplyTemplate,
  useDeleteQuickReplyTemplate,
  useQuickReplyCategories,
  useQuickReplyTemplates,
  useToggleQuickReplyPin,
  useUpdateQuickReplyTemplate,
  useUploadTemplateMedia,
} from "@/hooks/use-quick-replies";
import type { CreateQuickReplyTemplateInput, QuickReplyTemplate, UpdateQuickReplyTemplateInput } from "@/types/quick-reply";
import { MAX_UPLOAD_IMAGE_BYTES, isSupportedImageMime } from "@/types/media";
import { cn } from "@/lib/utils";

type TemplateContentKind = "text" | "image";

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
  const items = template.activeVersion?.items ?? [];
  const textItem = items.find((i) => i.itemKind === "text");
  const mediaItem = items.find((i) => i.itemKind === "media");
  const preview =
    textItem?.textBody?.slice(0, 120) ??
    mediaItem?.caption?.slice(0, 120) ??
    (mediaItem ? "Plantilla con imagen" : "");

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
          {mediaItem ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[11px] text-muted">
              <ImageIcon className="size-3" />
              Imagen
            </span>
          ) : null}
          {template.favorite ? (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
              Fijada en chat
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[13px] text-muted">
          {template.category?.name ?? "Sin categoría"} · v{template.activeVersion?.versionNumber ?? 1} ·{" "}
          {items.length} ítems
        </p>
        <div className="mt-2 flex items-start gap-3">
          {mediaItem?.mediaAsset?.publicUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaItem.mediaAsset.publicUrl}
              alt=""
              className="size-12 shrink-0 rounded-lg border border-line object-cover"
            />
          ) : null}
          {preview ? (
            <p className="line-clamp-2 text-[13px] text-ink/80">{preview}</p>
          ) : null}
        </div>
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
  const firstMediaItem = template?.activeVersion?.items?.find((i) => i.itemKind === "media");

  const [name, setName] = useState(template?.name ?? "");
  const [shortcut, setShortcut] = useState(template?.shortcut ?? "");
  const [categoryId, setCategoryId] = useState(template?.categoryId ?? categories[0]?.id ?? "");
  const [contentKind, setContentKind] = useState<TemplateContentKind>(
    firstMediaItem ? "image" : "text",
  );
  const [textBody, setTextBody] = useState(firstTextItem?.textBody ?? "");
  const [caption, setCaption] = useState(firstMediaItem?.caption ?? "");
  const [existingMediaAssetId, setExistingMediaAssetId] = useState<string | null>(
    firstMediaItem?.mediaAssetId ?? null,
  );
  const [existingPreviewUrl, setExistingPreviewUrl] = useState<string | null>(
    firstMediaItem?.mediaAsset?.publicUrl ?? null,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pinInChat, setPinInChat] = useState(template?.favorite ?? true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadTemplateMedia();

  useEffect(() => {
    if (!imageFile) {
      setLocalPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const previewUrl = localPreviewUrl ?? existingPreviewUrl;
  const hasImage = Boolean(imageFile || existingMediaAssetId);
  const canSaveText = name.trim() && shortcut.trim() && categoryId && textBody.trim();
  const canSaveImage = name.trim() && shortcut.trim() && categoryId && hasImage;
  const canSave = contentKind === "text" ? canSaveText : canSaveImage;

  const pickImage = (file: File) => {
    setFormError(null);
    const mimeType = file.type || "application/octet-stream";
    if (!isSupportedImageMime(mimeType)) {
      setFormError("Solo se permiten imágenes (JPG, PNG, WEBP, HEIC, etc.).");
      return;
    }
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      setFormError("La imagen supera el límite de 10 MB.");
      return;
    }
    setImageFile(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setExistingMediaAssetId(null);
    setExistingPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <h3 className="text-[17px] font-semibold text-ink">
          {isEdit ? "Editar plantilla" : "Nueva plantilla"}
        </h3>
        <div className="mt-4 space-y-3">
          <SegmentedControl
            options={[
              { label: "Texto", value: "text" },
              { label: "Imagen", value: "image" },
            ]}
            value={contentKind}
            onChange={setContentKind}
          />
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

          {contentKind === "text" ? (
            <textarea
              value={textBody}
              onChange={(e) => setTextBody(e.target.value)}
              placeholder="Contenido… Usa {{asesor}} y {{cliente}}"
              className="min-h-[120px] w-full rounded-xl border border-line px-4 py-3 text-[14px]"
            />
          ) : (
            <div className="space-y-3 rounded-xl border border-line p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pickImage(file);
                  e.target.value = "";
                }}
              />
              {previewUrl ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Vista previa"
                    className="max-h-48 w-full rounded-lg border border-line object-contain bg-canvas"
                  />
                  <button
                    type="button"
                    aria-label="Quitar imagen"
                    onClick={clearImage}
                    className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-canvas/50 px-4 py-8 text-muted transition-colors hover:border-brand hover:text-brand"
                >
                  <Upload className="size-8" />
                  <span className="text-[14px] font-medium">Seleccionar imagen</span>
                  <span className="text-[12px]">JPG, PNG, WEBP — máx. 10 MB</span>
                </button>
              )}
              {previewUrl ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Cambiar imagen
                </Button>
              ) : null}
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Pie de foto (opcional)… Usa {{asesor}} y {{cliente}}"
                className="min-h-[80px] w-full rounded-xl border border-line px-4 py-3 text-[14px]"
              />
            </div>
          )}

          {formError ? <p className="text-[13px] text-danger-ink">{formError}</p> : null}

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
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={saving || !canSave || uploadMedia.isPending}
            onClick={async () => {
              setFormError(null);
              setSaving(true);
              try {
                let items: CreateQuickReplyTemplateInput["items"];
                if (contentKind === "text") {
                  items = [{ sortOrder: 1, itemKind: "text", textBody: textBody.trim() }];
                } else {
                  let mediaAssetId = existingMediaAssetId;
                  if (imageFile) {
                    const asset = await uploadMedia.mutateAsync({
                      file: imageFile,
                      categoryId,
                    });
                    mediaAssetId = asset.id;
                  }
                  if (!mediaAssetId) {
                    setFormError("Selecciona una imagen para la plantilla.");
                    return;
                  }
                  items = [
                    {
                      sortOrder: 1,
                      itemKind: "media",
                      mediaAssetId,
                      caption: caption.trim() || undefined,
                    },
                  ];
                }
                await onSave({
                  name: name.trim(),
                  shortcut,
                  categoryId,
                  favorite: pinInChat,
                  items,
                });
              } catch (error) {
                setFormError(error instanceof Error ? error.message : "No se pudo guardar.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving || uploadMedia.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Guardando…
              </>
            ) : isEdit ? (
              "Guardar cambios"
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
