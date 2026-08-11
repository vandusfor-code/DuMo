"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import type { OrphanSaleGestion } from "@/types/sales-reconciliation";

const key = ["admin", "ventas-reconciliacion"] as const;

export function useOrphanSaleGestiones() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiGet<OrphanSaleGestion[]>("/api/admin/ventas-reconciliacion"),
  });
}

export function useRegisterOrphanSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gestion: OrphanSaleGestion) =>
      apiPost<{ saleId: string }>("/api/admin/ventas-reconciliacion", {
        action: "register",
        gestion,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["admin", "sales"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin", "commissions"] });
      qc.invalidateQueries({ queryKey: ["admin", "accounting"] });
    },
  });
}

export function useDismissOrphanSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gestionId: string) =>
      apiPost<{ ok: boolean }>("/api/admin/ventas-reconciliacion", {
        action: "dismiss",
        gestionId,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
