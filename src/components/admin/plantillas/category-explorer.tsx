"use client";

import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getCategoryVisual } from "@/lib/plantillas-category-icons";
import { cn } from "@/lib/utils";
import type { QuickReplyCategory } from "@/types/quick-reply";

export function CategoryExplorer({
  categories,
  countsByCategoryId,
  activeCategoryId,
  onSelectCategory,
  onOpenAllCategories,
}: {
  categories: QuickReplyCategory[];
  countsByCategoryId: Record<string, number>;
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onOpenAllCategories: () => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-ink">Explorar por categoría</h3>
        <button
          type="button"
          onClick={onOpenAllCategories}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
        >
          Ver todas las categorías
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {categories.map((category) => {
          const visual = getCategoryVisual(category.slug, category.name);
          const Icon = visual.icon;
          const count = countsByCategoryId[category.id] ?? 0;
          const active = activeCategoryId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(active ? "" : category.id)}
              className="shrink-0 text-left"
            >
              <Card
                className={cn(
                  "min-w-[140px] px-4 py-4 transition-colors hover:border-brand/30",
                  active && "border-brand/40 bg-brand-soft/20",
                )}
              >
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-full",
                    visual.bgClass,
                  )}
                >
                  <Icon className={cn("size-5", visual.iconClass)} />
                </span>
                <p className="mt-3 text-[14px] font-semibold text-ink">{category.name}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {count} plantilla{count === 1 ? "" : "s"}
                </p>
              </Card>
            </button>
          );
        })}
      </div>
    </section>
  );
}
