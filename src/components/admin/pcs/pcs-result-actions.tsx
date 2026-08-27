"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PcsValidationResultRow } from "@/types/pcs-validation";

function buildCopyText(rows: PcsValidationResultRow[]): string {
  return rows
    .filter((r) => r.estado === "valido")
    .map((r) => (r.nombre ? `${r.pcs}, ${r.nombre}` : r.pcs))
    .join("\n");
}

export function PcsResultActions({ jobId, rows }: { jobId: string; rows: PcsValidationResultRow[] }) {
  const [copied, setCopied] = useState(false);
  const validCount = rows.filter((r) => r.estado === "valido").length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText(rows));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" className="gap-2" disabled={validCount === 0} onClick={() => void handleCopy()}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copiado" : "Copiar resultado"}
      </Button>
      <Button asChild variant="secondary" className="gap-2">
        <a href={`/api/pcs/validate/${jobId}/download`} download>
          <Download className="size-4" />
          Descargar Excel
        </a>
      </Button>
    </div>
  );
}
