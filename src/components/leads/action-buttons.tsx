"use client";

import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActionButtons({
  isSaving,
  onCancel,
}: {
  isSaving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isSaving}>
        {isSaving ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : (
          <Save className="size-[18px]" />
        )}
        Guardar venta
      </Button>
    </div>
  );
}
