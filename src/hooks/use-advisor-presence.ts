"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPatch } from "@/lib/api-client";
import { userKeys } from "@/hooks/use-current-user";
import type { AdvisorPresenceStatus } from "@/lib/advisor-presence";

/** Marca el propio estado operativo (solo asesoras) — no cierra la sesión al pasar a "desconectado". */
export function useSetOwnPresence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: AdvisorPresenceStatus) =>
      apiPatch<{ ok: boolean; presenceStatus: AdvisorPresenceStatus }>(
        "/api/advisors/me/presence",
        { status },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.me }),
  });
}
