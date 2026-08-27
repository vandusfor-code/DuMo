"use client";

import { Badge } from "@/components/ui/badge";
import type { PcsValidationResultRow } from "@/types/pcs-validation";

const ESTADO_BADGE: Record<PcsValidationResultRow["estado"], { label: string; tone: "success" | "danger" | "warning" }> = {
  valido: { label: "✅ Con WhatsApp", tone: "success" },
  no_valido: { label: "❌ Sin WhatsApp", tone: "danger" },
  invalido: { label: "⚠️ Inválido", tone: "warning" },
  error: { label: "⚠️ Error", tone: "warning" },
};

export function PcsResultsTable({ rows }: { rows: PcsValidationResultRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="max-h-96 overflow-y-auto rounded-xl border border-line">
      <table className="w-full text-left text-[13px]">
        <thead className="sticky top-0 bg-canvas text-[12px] font-semibold text-muted">
          <tr>
            <th className="px-4 py-2.5">PCS</th>
            <th className="px-4 py-2.5">Nombre</th>
            <th className="px-4 py-2.5">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => {
            const badge = ESTADO_BADGE[row.estado];
            return (
              <tr key={`${row.pcs}-${i}`}>
                <td className="px-4 py-2.5 font-medium text-ink">{row.pcs}</td>
                <td className="px-4 py-2.5 text-muted">{row.nombre ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
