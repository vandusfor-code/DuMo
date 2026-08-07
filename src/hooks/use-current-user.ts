"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { User } from "@/types/user";

export const userKeys = {
  me: ["user", "me"] as const,
};

/** Usuario conectado (solo lectura; la cookie se establece únicamente en login). */
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: () => apiGet<User>("/api/users/me"),
    retry: 1,
    staleTime: 60_000,
  });
}
