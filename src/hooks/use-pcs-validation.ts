"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import type { PcsValidationInputRow } from "@/lib/pcs-validation";
import type { PcsValidationJobDetail } from "@/types/pcs-validation";

export function usePcsUploadPreview() {
  return useMutation({
    mutationFn: (numeros: PcsValidationInputRow[]) =>
      apiPost<{ totalNumeros: number; preview: PcsValidationInputRow[] }>("/api/pcs/upload", {
        numeros,
      }),
  });
}

export function usePcsValidate() {
  return useMutation({
    mutationFn: (numeros: PcsValidationInputRow[]) =>
      apiPost<{ jobId: string }>("/api/pcs/validate", { numeros }),
  });
}

/** Progreso vía Socket.io (ver realtime-provider); polling cada 5s como red de seguridad. */
export function usePcsJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["pcs", "validate", jobId],
    queryFn: () => apiGet<PcsValidationJobDetail>(`/api/pcs/validate/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 5_000 : false;
    },
  });
}
