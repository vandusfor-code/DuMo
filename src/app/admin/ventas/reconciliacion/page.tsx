"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InitialsAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import {
  useOrphanSaleGestiones,
  useRegisterOrphanSale,
  useDismissOrphanSale,
} from "@/hooks/use-sales-reconciliation";
import type { OrphanSaleGestion } from "@/types/sales-reconciliation";

/**
 * Cola de revisión para las gestiones "venta" que quedaron huérfanas por el
 * bug de saveAction (ya corregido — ver save-lead-with-script.ts). El admin
 * decide caso por caso: registrar como venta real, o descartar si es dato
 * de prueba. Nada se crea automáticamente.
 */
export default function VentasReconciliacionPage() {
  const { data, isLoading, isError, refetch } = useOrphanSaleGestiones();
  const registerMutation = useRegisterOrphanSale();
  const dismissMutation = useDismissOrphanSale();
  const [confirmRegister, setConfirmRegister] = useState<OrphanSaleGestion | null>(null);
  const [confirmDismiss, setConfirmDismiss] = useState<OrphanSaleGestion | null>(null);
  const [lastResult, setLastResult] = useState<{ gestionId: string; saleId: string } | null>(null);

  // Marca como "posible dato de prueba" cuando el mismo teléfono se repite
  // muchas veces (patrón real encontrado: 17 gestiones sobre un mismo
  // número de un bot de integración) — es una señal, no una decisión.
  const phoneCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of data ?? []) counts.set(g.phone, (counts.get(g.phone) ?? 0) + 1);
    return counts;
  }, [data]);

  return (
    <div>
      <AdminPageHeader
        title="Reconciliación de ventas"
        subtitle='Gestiones tipificadas "venta" que nunca generaron una venta real — bug ya corregido, esto es el histórico.'
      />

      {isError && !data ? (
        <ErrorState title="No se pudo cargar la lista" onRetry={() => refetch()} />
      ) : isLoading && !data ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-card" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <Card className="grid place-items-center gap-2 p-12 text-center">
          <CheckCircle2 className="size-8 text-success" />
          <p className="text-[15px] font-medium text-ink">Todo reconciliado</p>
          <p className="text-[13px] text-muted">No hay gestiones &ldquo;venta&rdquo; pendientes de revisar.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {(data ?? []).map((g) => {
            const suspectTest = (phoneCounts.get(g.phone) ?? 0) > 2;
            const line = g.lines[0];
            return (
              <Card key={g.gestionId} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <InitialsAvatar initials={getInitials(g.customerName)} />
                    <div className="leading-tight">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink">{g.customerName}</p>
                        {suspectTest && (
                          <Badge tone="warning">
                            <AlertTriangle className="size-3" />
                            Posible dato de prueba
                          </Badge>
                        )}
                      </div>
                      <p className="text-[12px] text-muted">
                        RUT {g.rut} · {g.phone} · asesora {g.advisorName}
                      </p>
                      <p className="text-[11px] text-muted">
                        {new Date(g.createdAt).toLocaleString("es-CL")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setConfirmDismiss(g)}
                      disabled={dismissMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                      Descartar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setConfirmRegister(g)}
                      disabled={registerMutation.isPending || g.lines.length === 0}
                    >
                      Registrar como venta
                    </Button>
                  </div>
                </div>

                {line && (
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[13px] sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] text-muted">Plan</p>
                      <p className="text-ink">{line.planId || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">Tipo</p>
                      <p className="text-ink">{line.saleType || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">Equipo</p>
                      <p className="text-ink">{line.equipment || "Sin equipo"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">Comuna</p>
                      <p className="text-ink">{line.comuna || "—"}</p>
                    </div>
                  </div>
                )}

                {lastResult?.gestionId === g.gestionId && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-[13px] text-success-ink">
                    <CheckCircle2 className="size-4" />
                    Registrada como venta {lastResult.saleId}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmRegister !== null}
        title="Registrar como venta real"
        description={
          confirmRegister
            ? `Se creará una venta real a nombre de ${confirmRegister.advisorName}, atribuida a ella igual que si la hubiera guardado hoy. Esto afecta su meta y su comisión del mes en que se creó. No se puede deshacer.`
            : ""
        }
        confirmLabel="Registrar venta"
        isLoading={registerMutation.isPending}
        onCancel={() => setConfirmRegister(null)}
        onConfirm={async () => {
          if (!confirmRegister) return;
          const result = await registerMutation.mutateAsync(confirmRegister);
          setLastResult({ gestionId: confirmRegister.gestionId, saleId: result.saleId });
          setConfirmRegister(null);
        }}
      />

      <ConfirmDialog
        open={confirmDismiss !== null}
        title="Descartar esta gestión"
        description="Se marca como revisada y no vuelve a aparecer en esta lista. No crea ninguna venta ni afecta nada más."
        confirmLabel="Descartar"
        isLoading={dismissMutation.isPending}
        onCancel={() => setConfirmDismiss(null)}
        onConfirm={async () => {
          if (!confirmDismiss) return;
          await dismissMutation.mutateAsync(confirmDismiss.gestionId);
          setConfirmDismiss(null);
        }}
      />
    </div>
  );
}
