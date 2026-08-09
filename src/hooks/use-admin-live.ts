"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api-client";
import type { AdvisorPresenceStatus } from "@/lib/advisor-presence";
import type { AdvisorPresenceUpdateResult, LiveSnapshot } from "@/types/admin-live";

const LIVE_POLL_MS = 30_000;

export function useLiveSnapshot(selectedDate: string) {
  return useQuery({
    queryKey: ["admin", "live", "snapshot", selectedDate],
    queryFn: () =>
      apiGet<LiveSnapshot>(`/api/admin/live/snapshot?date=${encodeURIComponent(selectedDate)}`),
    refetchInterval: LIVE_POLL_MS,
    refetchIntervalInBackground: true,
  });
}

export function useSetAdvisorPresence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      advisorId,
      status,
    }: {
      advisorId: string;
      status: AdvisorPresenceStatus;
    }) =>
      apiPatch<AdvisorPresenceUpdateResult & { ok: boolean }>(
        "/api/admin/live/presence",
        { advisorId, status },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "live", "snapshot"] });
    },
  });
}
