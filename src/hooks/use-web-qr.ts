"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import type { WhatsAppChannel } from "@/types/web-qr";

export const webQrKeys = {
  channels: ["web-qr", "channels"] as const,
  session: (channelId: string) => ["web-qr", "session", channelId] as const,
};

type ChannelsResponse = {
  configured: boolean;
  channels: WhatsAppChannel[];
};

type SessionResponse = {
  channelId: string;
  bridgeSessionId?: string;
  status: string;
  qrDataUrl?: string;
  phoneNumber?: string;
};

export function useWebQrChannels() {
  return useQuery({
    queryKey: webQrKeys.channels,
    queryFn: () => apiGet<ChannelsResponse>("/api/web-qr/channels"),
    refetchInterval: 10_000,
  });
}

export function useWebQrSession(channelId: string | null, pollQr = false) {
  return useQuery({
    queryKey: webQrKeys.session(channelId ?? ""),
    queryFn: () => apiGet<SessionResponse>(`/api/web-qr/channels/${channelId}/session`),
    enabled: Boolean(channelId),
    refetchInterval: pollQr ? 2500 : false,
  });
}

export function useCreateWebQrChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label: string) =>
      apiPost<WhatsAppChannel>("/api/web-qr/channels", { label }),
    onSuccess: () => qc.invalidateQueries({ queryKey: webQrKeys.channels }),
  });
}

export function useStartWebQrSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) =>
      apiPost<SessionResponse>(`/api/web-qr/channels/${channelId}/session`, {}),
    onSuccess: (_data, channelId) => {
      qc.invalidateQueries({ queryKey: webQrKeys.channels });
      qc.invalidateQueries({ queryKey: webQrKeys.session(channelId) });
    },
  });
}
