"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import type {
  SettingsSnapshot,
  SystemUser,
  UpdateCompanyInput,
  UpdateGoogleSheetsInput,
  UpdateWhatsAppInput,
  UpsertSystemUserInput,
} from "@/types/settings";

export function useSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => apiGet<SettingsSnapshot>("/api/admin/settings"),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCompanyInput) =>
      apiPost("/api/admin/settings", { section: "company", data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}

export function useUpdateWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateWhatsAppInput) =>
      apiPost("/api/admin/settings", { section: "whatsapp", data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}

export function useUpdateGoogleSheets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateGoogleSheetsInput) =>
      apiPost("/api/admin/settings", { section: "googleSheets", data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}

export function useTestGoogleSheets() {
  return useMutation({
    mutationFn: () => apiPost<{ ok: boolean; message: string }>("/api/admin/settings", { section: "testGoogleSheets" }),
  });
}

export function useCreateSystemUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertSystemUserInput) =>
      apiPost<SystemUser>("/api/admin/settings", { section: "user", data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}

export function useUpdateSystemUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpsertSystemUserInput }) =>
      apiPut<SystemUser>("/api/admin/settings", { section: "user", id, data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}

export function useToggleSystemUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiPatch<SystemUser>("/api/admin/settings", { action: "toggleUser", id, active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}

export function useDeleteSystemUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/settings?userId=${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}
