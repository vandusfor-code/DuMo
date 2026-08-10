"use client";

import { Loader2, DoorClosed, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActionButtons({
  isSaving,
  onCancel,
  mode,
  onPrimaryAction,
}: {
  isSaving: boolean;
  onCancel: () => void;
  mode: "script" | "close";
  onPrimaryAction?: () => void;
}) {
  const isClose = mode === "close";

  return (
    <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isSaving} onClick={() => onPrimaryAction?.()}>
        {isSaving ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : isClose ? (
          <DoorClosed className="size-[18px]" />
        ) : (
          <ScrollText className="size-[18px]" />
        )}
        {isClose ? "Guardar y cerrar" : "Generar Script"}
      </Button>
    </div>
  );
}
