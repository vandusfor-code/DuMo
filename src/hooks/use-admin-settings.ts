"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import type {
  SettingsSnapshot,
  UpdateCompanyInput,
  UpdateGoogleSheetsInput,
  UpdateMessengerInput,
  UpdateWhatsAppInput,
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

export function useUpdateMessenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMessengerInput) =>
      apiPost("/api/admin/settings", { section: "messenger", data }),
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
