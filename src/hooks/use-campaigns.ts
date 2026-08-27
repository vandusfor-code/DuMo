"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type {
  Campaign,
  CampaignColumnMapping,
  CampaignContact,
  CampaignEvent,
  CampaignSettingsInput,
  CampaignValidationSummary,
} from "@/types/campaign";

const ACTIVE_STATUSES = new Set(["EJECUTANDO", "EN_COLA", "PROGRAMADA"]);

export function useCampaigns() {
  return useQuery({
    queryKey: ["admin", "campaigns", "list"],
    queryFn: () => apiGet<Campaign[]>("/api/admin/campaigns"),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.some((c) => ACTIVE_STATUSES.has(c.status)) ? 10_000 : false;
    },
  });
}

export interface CampaignDetail {
  campaign: Campaign;
  countsByStatus: Record<string, number>;
  events: CampaignEvent[];
  staleContacts: CampaignContact[];
}

/** Progreso vía Socket.io (ver realtime-provider); polling como red de seguridad mientras corre. */
export function useCampaign(id: string | null) {
  return useQuery({
    queryKey: ["admin", "campaigns", id],
    queryFn: () => apiGet<CampaignDetail>(`/api/admin/campaigns/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.campaign.status;
      return status === "EJECUTANDO" ? 5_000 : false;
    },
  });
}

export function useCampaignContacts(id: string | null) {
  return useQuery({
    queryKey: ["admin", "campaigns", id, "contacts"],
    queryFn: () => apiGet<CampaignContact[]>(`/api/admin/campaigns/${id}/contacts`),
    enabled: Boolean(id),
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      apiPost<Campaign>("/api/admin/campaigns", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns", "list"] }),
  });
}

export function useImportCampaignContacts(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { rows: Record<string, string>[]; mapping: CampaignColumnMapping }) =>
      apiPost<CampaignValidationSummary>(`/api/admin/campaigns/${campaignId}/import`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns", campaignId] }),
  });
}

export function useUpdateCampaignMessage(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageTemplate: string) =>
      apiPatch<{ ok: true }>(`/api/admin/campaigns/${campaignId}/message`, { messageTemplate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns", campaignId] }),
  });
}

export interface CampaignMessagePreview {
  contactId: string;
  name: string;
  phone: string;
  text: string;
  missingVariables: string[];
}

export function useCampaignPreview(campaignId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "campaigns", campaignId, "preview"],
    queryFn: () => apiGet<CampaignMessagePreview[]>(`/api/admin/campaigns/${campaignId}/preview`),
    enabled: Boolean(campaignId) && enabled,
  });
}

export function useUpdateCampaignSettings(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignSettingsInput) =>
      apiPatch<{ ok: true }>(`/api/admin/campaigns/${campaignId}/settings`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns", campaignId] }),
  });
}

function useCampaignAction(campaignId: string, action: "start" | "pause" | "resume" | "cancel") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<Campaign>(`/api/admin/campaigns/${campaignId}/${action}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "campaigns", campaignId] });
      qc.invalidateQueries({ queryKey: ["admin", "campaigns", "list"] });
    },
  });
}

export const useStartCampaign = (id: string) => useCampaignAction(id, "start");
export const usePauseCampaign = (id: string) => useCampaignAction(id, "pause");
export const useResumeCampaign = (id: string) => useCampaignAction(id, "resume");
export const useCancelCampaign = (id: string) => useCampaignAction(id, "cancel");

export function useStaleContactAction(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, action }: { contactId: string; action: "requeue" | "mark-failed" }) =>
      apiPatch<{ ok: true }>(`/api/admin/campaigns/${campaignId}/contacts/${contactId}`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "campaigns", campaignId] });
      qc.invalidateQueries({ queryKey: ["admin", "campaigns", campaignId, "contacts"] });
    },
  });
}

export function useCampaignsKillSwitch() {
  return useQuery({
    queryKey: ["admin", "campaigns", "kill-switch"],
    queryFn: () => apiGet<{ active: boolean }>("/api/admin/campaigns/kill-switch"),
  });
}

export function useSetCampaignsKillSwitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (active: boolean) =>
      apiPost<{ active: boolean }>("/api/admin/campaigns/kill-switch", { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "campaigns"] }),
  });
}
