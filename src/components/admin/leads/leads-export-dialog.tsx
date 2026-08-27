"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { businessDateISO } from "@/lib/date";

/** Exporta leads a Excel filtrados por rango de fecha de último mensaje — alimenta el importador de Campañas. */
export function LeadsExportDialog({ onClose }: { onClose: () => void }) {
  const today = businessDateISO();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setError(null);
    if (from > to) {
      setError("La fecha inicial no puede ser posterior a la final.");
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/leads/export?from=${from}&to=${to}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "No se pudo generar el archivo.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${from}_a_${to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el archivo.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-ink">Exportar leads</h3>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-[13px] text-muted">
          Descarga los leads por fecha de último mensaje — listo para subir a Campañas.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[13px] text-muted">Desde</span>
            <input
              type="date"
              value={from}
              max={today}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 text-[14px]"
            />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Hasta</span>
            <input
              type="date"
              value={to}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 text-[14px]"
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-[13px] text-danger-ink">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={downloading}>
            Cancelar
          </Button>
          <Button onClick={download} disabled={downloading}>
            <Download className="size-4" />
            {downloading ? "Generando..." : "Descargar Excel"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
