"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import { advisorApiGet } from "@/lib/advisor-query";
import type { CloseDuoSaleResult, DuoSale } from "@/types/duo-sale";

const adminKey = ["admin", "ventas-por-cerrar"] as const;
const advisorKey = ["dashboard", "ventas-por-cerrar"] as const;

/** Vista admin — todos los casos de Operación Duo. */
export function useAdminVentasPorCerrar() {
  return useQuery({
    queryKey: adminKey,
    queryFn: () => apiGet<DuoSale[]>("/api/admin/ventas-por-cerrar"),
    refetchInterval: 15_000,
  });
}

export function useAssignDuoSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; advisorId: string; advisorName: string }) =>
      apiPost<DuoSale>("/api/admin/ventas-por-cerrar", { action: "assign", ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKey }),
  });
}

/** Vista asesora de cierre — solo lo asignado a la sesión actual. */
export function useAdvisorVentasPorCerrar() {
  return useQuery({
    queryKey: advisorKey,
    queryFn: () => advisorApiGet<DuoSale[]>("/api/dashboard/ventas-por-cerrar"),
    refetchInterval: 15_000,
    retry: 2,
  });
}

export function useAddDuoClosingNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; text: string }) =>
      apiPost<DuoSale>("/api/dashboard/ventas-por-cerrar", { action: "addNote", ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: advisorKey }),
  });
}

/** DUO-4 — el cierre: crea la venta real + la comisión de la asesora de cierre. */
export function useCloseDuoSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<CloseDuoSaleResult>("/api/dashboard/ventas-por-cerrar", { action: "close", id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advisorKey });
      qc.invalidateQueries({ queryKey: ["admin", "ventas-por-cerrar"] });
    },
  });
}
