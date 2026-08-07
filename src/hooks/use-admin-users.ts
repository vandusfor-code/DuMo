"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import type { AuthRole, CreateUserInput, UpdateUserInput } from "@/types/auth";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  roleKey: AuthRole;
  avatarUrl: string;
  active: boolean;
};

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiGet<PublicUser[]>("/api/admin/users"),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) => apiPost<PublicUser>("/api/admin/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "advisors"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      apiPut<PublicUser>("/api/admin/users", { id, data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useToggleUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiPatch<PublicUser>("/api/admin/users", { action: "toggle", id, active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "advisors"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/users?id=${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "advisors"] });
    },
  });
}

export function useAdminChangePassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiPatch("/api/admin/users", { action: "changePassword", id, newPassword }),
  });
}

export function useAdminAdvisors() {
  return useQuery({
    queryKey: ["admin", "advisors"],
    queryFn: () => apiGet<import("@/types/admin-advisor").AdvisorsResult>("/api/admin/advisors"),
  });
}

export function useUpdateAdvisorGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; monthlySalesGoal: number | null }) =>
      apiPatch("/api/admin/advisors", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "advisors"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<PublicUser>("/api/auth/profile"),
    retry: 1,
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; username: string }) =>
      apiPut<PublicUser>("/api/auth/profile", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });
}

export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiPatch("/api/auth/profile", { action: "changePassword", data }),
  });
}
