"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Control } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { useTipificationCatalog } from "@/hooks/use-tipification-catalog";
import { getTipificationBadgeFromCatalog, getTipificationLabelFromCatalog } from "@/lib/tipification-utils";
import { authHeader } from "@/lib/auth/client-token";
import type { LeadFormValues } from "@/types/lead-form";
import type { ConversationTipification } from "@/types/conversation";
import type { Conversation } from "@/types/conversation";
import type { AdminConversation } from "@/types/admin-lead";
import type { Tipification } from "@/types/tipification";

export const pendingTipificationKeys = {
  byConversation: (id: string) => ["leads", "pending-tipification", id] as const,
};

export function tipificationLabelFromSlug(
  slug: string,
  catalog: Pick<Tipification, "slug" | "name" | "badgeBg" | "badgeText">[],
): ConversationTipification {
  const badge = getTipificationBadgeFromCatalog(slug, catalog);
  return {
    slug,
    name: getTipificationLabelFromCatalog(slug, catalog),
    badgeBg: badge.badgeBg,
    badgeText: badge.badgeText,
  };
}

export function setPendingTipificationLabel(
  queryClient: QueryClient,
  conversationId: string,
  label: ConversationTipification | null,
) {
  const key = pendingTipificationKeys.byConversation(conversationId);
  if (!label) {
    queryClient.removeQueries({ queryKey: key });
    return;
  }
  queryClient.setQueryData(key, label);
}

export function clearPendingTipificationLabel(queryClient: QueryClient, conversationId: string) {
  setPendingTipificationLabel(queryClient, conversationId, null);
}

function patchTipificationInList<T extends { id: string; latestTipification?: ConversationTipification | null }>(
  rows: T[] | undefined,
  conversationId: string,
  label: ConversationTipification | null,
): T[] | undefined {
  if (!rows) return rows;
  return rows.map((row) =>
    row.id === conversationId ? { ...row, latestTipification: label } : row,
  );
}

/** Tras guardar: la etiqueta draft pasa a ser la persistida en caché de bandeja. */
export function commitTipificationLabel(
  queryClient: QueryClient,
  conversationId: string,
  slug: string,
  catalog: Pick<Tipification, "slug" | "name" | "badgeBg" | "badgeText">[],
) {
  const label = tipificationLabelFromSlug(slug, catalog);
  clearPendingTipificationLabel(queryClient, conversationId);
  queryClient.setQueryData<Conversation[]>(["leads", "conversations"], (prev) =>
    patchTipificationInList(prev, conversationId, label),
  );
  queryClient.setQueryData<AdminConversation[]>(["admin", "leads", "conversations"], (prev) =>
    patchTipificationInList(prev, conversationId, label),
  );
}

/** Etiqueta visible: draft en gestión (dropdown) o última guardada en BD. */
export function useDisplayTipification(conversation: {
  id: string;
  latestTipification?: ConversationTipification | null;
}) {
  const { data: pending } = useQuery({
    queryKey: pendingTipificationKeys.byConversation(conversation.id),
    queryFn: (): ConversationTipification | null => null,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    enabled: false,
  });
  return pending ?? conversation.latestTipification ?? null;
}

export async function persistConversationTipification(
  conversationId: string,
  slug: string,
): Promise<void> {
  const res = await fetch(
    `/api/leads/conversations/${encodeURIComponent(conversationId)}/tipification`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeader(),
      },
      body: JSON.stringify({ slug }),
    },
  );
  if (!res.ok) {
    throw new Error("No se pudo guardar la tipificación.");
  }
}

/** Sincroniza el dropdown de tipificación con la etiqueta en la lista lateral. */
export function useSyncPendingTipificationLabel(
  conversationId: string,
  control: Control<LeadFormValues>,
) {
  const queryClient = useQueryClient();
  const type = useWatch({ control, name: "type" });
  const { catalog } = useTipificationCatalog();

  useEffect(() => {
    if (!conversationId || !type) {
      clearPendingTipificationLabel(queryClient, conversationId);
      return;
    }
    setPendingTipificationLabel(
      queryClient,
      conversationId,
      tipificationLabelFromSlug(type, catalog),
    );
  }, [conversationId, type, catalog, queryClient]);
}
