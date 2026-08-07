"use client";

import { Loader2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActionButtons({
  isSaving,
  onCancel,
  onGenerateScript,
}: {
  isSaving: boolean;
  onCancel: () => void;
  onGenerateScript?: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
      <Button
        type="submit"
        disabled={isSaving}
        onClick={() => onGenerateScript?.()}
      >
        {isSaving ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : (
          <ScrollText className="size-[18px]" />
        )}
        Generar Script
      </Button>
    </div>
  );
}
