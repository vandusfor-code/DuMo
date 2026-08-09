"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCategoryVisual } from "@/lib/plantillas-category-icons";
import { cn } from "@/lib/utils";
import type { QuickReplyCategory } from "@/types/quick-reply";

export function CategoriesModal({
  open,
  categories,
  countsByCategoryId,
  activeCategoryId,
  onClose,
  onSelectCategory,
  onCreateCategory,
  creating,
}: {
  open: boolean;
  categories: QuickReplyCategory[];
  countsByCategoryId: Record<string, number>;
  activeCategoryId: string;
  onClose: () => void;
  onSelectCategory: (categoryId: string) => void;
  onCreateCategory: (name: string) => void;
  creating?: boolean;
}) {
  if (!open) return null;

  const handleCreate = () => {
    const name = window.prompt("Nombre de la categoría");
    if (name?.trim()) onCreateCategory(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="text-[17px] font-semibold text-ink">Todas las categorías</h3>
          <p className="mt-1 text-[13px] text-muted">Selecciona una para filtrar las plantillas.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <button
            type="button"
            onClick={() => {
              onSelectCategory("");
              onClose();
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[14px] transition-colors hover:bg-canvas",
              !activeCategoryId && "bg-brand-soft/40 text-brand",
            )}
          >
            <span className="font-medium">Todas las categorías</span>
          </button>

          <ul className="mt-1 space-y-1">
            {categories.map((category) => {
              const visual = getCategoryVisual(category.slug, category.name);
              const Icon = visual.icon;
              const count = countsByCategoryId[category.id] ?? 0;
              const active = activeCategoryId === category.id;

              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(category.id);
                      onClose();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-canvas",
                      active && "bg-brand-soft/40",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full",
                        visual.bgClass,
                      )}
                    >
                      <Icon className={cn("size-[18px]", visual.iconClass)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">
                        {category.name}
                      </span>
                      <span className="text-[12px] text-muted">
                        {count} plantilla{count === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="button" onClick={handleCreate} disabled={creating}>
            <Plus className="size-4" />
            Nueva categoría
          </Button>
        </div>
      </Card>
    </div>
  );
}
