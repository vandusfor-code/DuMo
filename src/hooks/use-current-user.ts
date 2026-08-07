"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { saveClientToken } from "@/lib/auth/client-token";
import { CURRENT_USER } from "@/lib/session";
import type { User } from "@/types/user";

export const userKeys = {
  me: ["user", "me"] as const,
};

type MeResponse = User & { sessionToken?: string };

/**
 * Usuario conectado. Sincroniza el token de respaldo en localStorage con el
 * servidor en cada carga — evita desincronización tras recargas o navegación.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: async () => {
      const data = await apiGet<MeResponse>("/api/users/me");
      if (data.sessionToken) {
        saveClientToken(data.sessionToken);
      }
      const { sessionToken: _token, ...user } = data;
      return user;
    },
    retry: 1,
    staleTime: 60_000,
    placeholderData: {
      id: "me",
      name: CURRENT_USER.name,
      role: CURRENT_USER.role,
      avatarUrl: CURRENT_USER.avatarUrl,
      email: "",
    } satisfies User,
  });
}
