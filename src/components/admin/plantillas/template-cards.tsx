"use client";

import {
  ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  MoreVertical,
  Pencil,
  Pin,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCategoryVisual } from "@/lib/plantillas-category-icons";
import { PINNED_LIMIT_MESSAGE } from "@/lib/pinned-quick-replies.constants";
import { cn } from "@/lib/utils";
import type { QuickReplyTemplate } from "@/types/quick-reply";
import { getTemplateItemCount, getTemplatePreview } from "./template-preview";

export function TemplateCard({
  template,
  pinLoading,
  pinAtLimit,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  template: QuickReplyTemplate;
  pinLoading: boolean;
  pinAtLimit: boolean;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const items = template.activeVersion?.items ?? [];
  const mediaItem = items.find((i) => i.itemKind === "media");
  const preview = getTemplatePreview(template);
  const itemCount = getTemplateItemCount(template);
  const categoryName = template.category?.name ?? "Sin categoría";
  const version = template.activeVersion?.versionNumber ?? 1;
  const visual = getCategoryVisual(
    template.category?.slug ?? "",
    template.category?.name ?? categoryName,
  );
  const Icon = visual.icon;

  return (
    <Card
      className={cn(
        "flex h-full flex-col p-4 transition-colors",
        template.favorite && "border-brand/30 bg-brand-soft/10",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <span
            className={cn(
              "grid size-12 place-items-center rounded-2xl",
              visual.bgClass,
            )}
          >
            <Icon className={cn("size-5", visual.iconClass)} />
          </span>
          {template.favorite ? (
            <span className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full bg-brand text-white">
              <Star className="size-3 fill-current" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-ink">
              {template.name}
            </p>
            {template.favorite ? (
              <span className="shrink-0 rounded-full bg-[#EEF4FF] px-2 py-0.5 text-[11px] font-medium text-[#3538CD]">
                Fijada en chat
              </span>
            ) : null}
          </div>
          {mediaItem ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted">
              <ImageIcon className="size-3" />
              Imagen
            </span>
          ) : null}
        </div>
      </div>

      {preview ? (
        <p className="mt-3 line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted">
          {preview}
        </p>
      ) : (
        <div className="mt-3 flex-1" />
      )}

      <p className="mt-3 text-[12px] text-muted">
        {categoryName} · v{version} · {itemCount} item{itemCount === 1 ? "" : "s"}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          aria-label={template.favorite ? "Quitar del chat" : "Fijar en chat"}
          title={
            !template.favorite && pinAtLimit
              ? PINNED_LIMIT_MESSAGE
              : template.favorite
                ? "Quitar del chat"
                : "Fijar en chat"
          }
          disabled={pinLoading || (!template.favorite && pinAtLimit)}
          onClick={onTogglePin}
          className={cn(
            "grid size-9 place-items-center rounded-xl transition-colors",
            template.favorite
              ? "bg-brand text-white hover:bg-brand-hover"
              : "border border-line text-muted hover:border-brand/30 hover:bg-brand-soft hover:text-brand",
            !template.favorite && pinAtLimit && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted",
          )}
        >
          {pinLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Pin className={cn("size-4", template.favorite && "fill-current")} />
          )}
        </button>

        <button
          type="button"
          aria-label="Editar"
          title="Editar plantilla"
          onClick={onEdit}
          className="grid size-9 place-items-center rounded-xl border border-line text-muted transition-colors hover:border-brand/30 hover:bg-brand-soft hover:text-brand"
        >
          <Pencil className="size-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Más opciones"
              className="ml-auto grid size-9 place-items-center rounded-xl border border-line text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <MoreVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem tone="danger" onClick={onDelete}>
              <Trash2 className="size-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

export function TemplateListRow({
  template,
  pinLoading,
  pinAtLimit,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  template: QuickReplyTemplate;
  pinLoading: boolean;
  pinAtLimit: boolean;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const items = template.activeVersion?.items ?? [];
  const mediaItem = items.find((i) => i.itemKind === "media");
  const preview = getTemplatePreview(template);

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
          disabled={pinLoading || (!template.favorite && pinAtLimit)}
          onClick={onTogglePin}
          className={cn(
            "grid size-9 place-items-center rounded-lg transition-colors",
            template.favorite
              ? "bg-brand text-white hover:bg-brand-hover"
              : "text-muted hover:bg-brand-soft hover:text-brand",
            !template.favorite && pinAtLimit && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted",
          )}
        >
          <Pin className={cn("size-4", template.favorite && "fill-current")} />
        </button>
        <button
          type="button"
          aria-label="Editar"
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

export type TemplateViewMode = "grid" | "list";

export type TemplateSortMode = "recent" | "name" | "pinned";

export function TemplatesSectionHeader({
  viewMode,
  sortMode,
  onViewModeChange,
  onSortModeChange,
}: {
  viewMode: TemplateViewMode;
  sortMode: TemplateSortMode;
  onViewModeChange: (mode: TemplateViewMode) => void;
  onSortModeChange: (mode: TemplateSortMode) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-[15px] font-semibold text-ink">Todas las plantillas</h3>
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-xl border border-line p-1">
          <button
            type="button"
            aria-label="Vista en cuadrícula"
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "grid size-8 place-items-center rounded-lg transition-colors",
              viewMode === "grid" ? "bg-brand text-white" : "text-muted hover:text-brand",
            )}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Vista en lista"
            onClick={() => onViewModeChange("list")}
            className={cn(
              "grid size-8 place-items-center rounded-lg transition-colors",
              viewMode === "list" ? "bg-brand text-white" : "text-muted hover:text-brand",
            )}
          >
            <List className="size-4" />
          </button>
        </div>
        <select
          value={sortMode}
          onChange={(e) => onSortModeChange(e.target.value as TemplateSortMode)}
          className="h-9 rounded-xl border border-line bg-card px-3 text-[13px] text-ink"
        >
          <option value="recent">Más recientes</option>
          <option value="name">Nombre A–Z</option>
          <option value="pinned">Fijadas primero</option>
        </select>
      </div>
    </div>
  );
}
