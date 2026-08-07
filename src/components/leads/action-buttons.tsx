"use client";

import { Loader2, ScrollText, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActionButtons({
  isSaving,
  onCancel,
  mode,
  onPrimaryAction,
}: {
  isSaving: boolean;
  onCancel: () => void;
  mode: "script" | "tipify";
  onPrimaryAction?: () => void;
}) {
  const isTipify = mode === "tipify";

  return (
    <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isSaving} onClick={() => onPrimaryAction?.()}>
        {isSaving ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : isTipify ? (
          <Tag className="size-[18px]" />
        ) : (
          <ScrollText className="size-[18px]" />
        )}
        {isTipify ? "Tipificar" : "Generar Script"}
      </Button>
    </div>
  );
}
