"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { CURRENT_USER } from "@/lib/session";
import type { User } from "@/types/user";

export const userKeys = {
  me: ["user", "me"] as const,
};

/**
 * Current advisor. Falls back to the static session constant as placeholder
 * data so the header never flashes empty.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: () => apiGet<User>("/api/users/me"),
    placeholderData: {
      id: "me",
      name: CURRENT_USER.name,
      role: CURRENT_USER.role,
      avatarUrl: CURRENT_USER.avatarUrl,
      email: "",
    } satisfies User,
  });
}
