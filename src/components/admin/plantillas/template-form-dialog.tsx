"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useUploadTemplateMedia } from "@/hooks/use-quick-replies";
import { MAX_PINNED_QUICK_REPLIES } from "@/lib/pinned-quick-replies.constants";
import { MAX_UPLOAD_IMAGE_BYTES, isSupportedImageMime } from "@/types/media";
import type { CreateQuickReplyTemplateInput, QuickReplyTemplate } from "@/types/quick-reply";
import { cn } from "@/lib/utils";

type TemplateContentKind = "text" | "image";

export function TemplateFormDialog({
  template,
  categories,
  pinnedCount,
  defaultCarrier,
  onClose,
  onSave,
}: {
  template?: QuickReplyTemplate;
  categories: { id: string; name: string }[];
  pinnedCount: number;
  defaultCarrier: string;
  onClose: () => void;
  onSave: (input: CreateQuickReplyTemplateInput) => Promise<void>;
}) {
  const isEdit = Boolean(template);
  const firstTextItem = template?.activeVersion?.items?.find((i) => i.itemKind === "text");
  const firstMediaItem = template?.activeVersion?.items?.find((i) => i.itemKind === "media");
  const pinSlotsFull = pinnedCount >= MAX_PINNED_QUICK_REPLIES;
  const canPinMore = !pinSlotsFull || Boolean(template?.favorite);

  const [name, setName] = useState(template?.name ?? "");
  const [shortcut, setShortcut] = useState(template?.shortcut ?? "");
  const [categoryId, setCategoryId] = useState(template?.categoryId ?? categories[0]?.id ?? "");
  const [carrier, setCarrier] = useState(template?.carrier ?? defaultCarrier);
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
  const [pinInChat, setPinInChat] = useState(
    template?.favorite ?? (pinSlotsFull ? false : true),
  );
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
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="h-11 w-full rounded-xl border border-line px-4 text-[14px]"
          >
            <option value="wom">WOM</option>
            <option value="claro">Claro</option>
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

          <label
            className={cn(
              "flex items-center gap-2 text-[14px] text-ink",
              canPinMore ? "cursor-pointer" : "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="checkbox"
              checked={pinInChat}
              disabled={!canPinMore}
              onChange={(e) => setPinInChat(e.target.checked)}
              className="size-4 accent-brand disabled:opacity-60"
            />
            Fijar en el chat
          </label>
          {!canPinMore ? (
            <p className="text-[12px] text-muted">
              Ya hay {MAX_PINNED_QUICK_REPLIES} atajos fijados. Quita uno para fijar esta plantilla.
            </p>
          ) : null}
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
                  carrier,
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
