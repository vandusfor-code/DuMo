"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import type {
  OfferSimulationHistoryItem,
  OfferSimulationRecord,
  OfferSimulationRequest,
} from "@/types/offer-engine";

export const offerEngineKeys = {
  history: (leadId: string) => ["offer-engine", "history", leadId] as const,
  detail: (id: string) => ["offer-engine", "detail", id] as const,
};

export function useOfferSimulationHistory(leadId: string | null) {
  return useQuery({
    queryKey: offerEngineKeys.history(leadId ?? ""),
    queryFn: () =>
      apiGet<OfferSimulationHistoryItem[]>(
        `/api/offer-engine/history/${encodeURIComponent(leadId!)}`,
      ),
    enabled: Boolean(leadId),
    staleTime: 15_000,
  });
}

export function useOfferSimulationDetail(simulationId: string | null) {
  return useQuery({
    queryKey: offerEngineKeys.detail(simulationId ?? ""),
    queryFn: () =>
      apiGet<OfferSimulationRecord>(
        `/api/offer-engine/${encodeURIComponent(simulationId!)}`,
      ),
    enabled: Boolean(simulationId),
  });
}

export function useSimulateOffer(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<OfferSimulationRequest, "leadId">) =>
      apiPost<OfferSimulationRecord>("/api/offer-engine/simulate", {
        ...input,
        leadId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: offerEngineKeys.history(leadId) });
    },
  });
}
