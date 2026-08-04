"use client";

import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Footer with Cancelar / Guardar venta, right-aligned. */
export function FooterActions({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <Button asChild variant="secondary" size="lg">
        <Link href="/dashboard/mis-ventas">Cancelar</Link>
      </Button>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : (
          <Save className="size-[18px]" />
        )}
        Guardar venta
      </Button>
    </div>
  );
}
