"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminPendienteRow } from "@/types/admin-pendientes";

export function TransferPendienteDialog({
  open,
  pendiente,
  advisors,
  isLoading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  pendiente: AdminPendienteRow | null;
  advisors: { id: string; name: string }[];
  isLoading?: boolean;
  onConfirm: (advisorId: string) => void;
  onCancel: () => void;
}) {
  const [advisorId, setAdvisorId] = useState("");

  useEffect(() => {
    if (open) setAdvisorId(advisors[0]?.id ?? "");
  }, [open, advisors]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !pendiente) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-card border border-line bg-card p-6 shadow-pop"
      >
        <div className="flex items-start gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <ArrowRightLeft className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold text-ink">Transferir a asesora</h3>
            <p className="mt-1 text-[13px] text-muted">
              {pendiente.customerName} — {pendiente.tipificationName}. Se reabrirá el chat y pasará
              al módulo Recuperación (P5).
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-1.5">
          <label className="text-[12px] font-medium text-muted">Asesora disponible</label>
          <Select value={advisorId} onValueChange={setAdvisorId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar asesora" />
            </SelectTrigger>
            <SelectContent>
              {advisors.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={() => advisorId && onConfirm(advisorId)}
            disabled={!advisorId || isLoading}
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Confirmar transferencia"}
          </Button>
        </div>
      </div>
    </div>
  );
}
