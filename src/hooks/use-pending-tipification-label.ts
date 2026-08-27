"use client";

import { type QueryClient } from "@tanstack/react-query";
import { getTipificationBadgeFromCatalog, getTipificationLabelFromCatalog } from "@/lib/tipification-utils";
import { authHeader } from "@/lib/auth/client-token";
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

/**
 * Etiqueta visible en la lista.
 *
 * Antes esto priorizaba una etiqueta "pending" en caché sobre el dato real
 * de `conversation.latestTipification` — pero esa caché la fija
 * useSyncPendingTipificationLabel() al montar el panel (o al elegir en el
 * dropdown) y después queda pegada sin refrescarse mientras el panel siga
 * montado, así que podía desincronizarse del valor real y mostrar una
 * tipificación vieja/equivocada. commitTipificationLabel() YA escribe el
 * valor nuevo directo en la caché de la lista al elegir en el dropdown o al
 * guardar — instantáneo, sin necesitar esta capa "pending" aparte — así que
 * confiar solo en `conversation.latestTipification` (que además ya viene de
 * current_tipification_slug, que un mensaje nuevo no toca) es más simple y
 * no se puede desincronizar.
 */
export function useDisplayTipification(conversation: {
  id: string;
  latestTipification?: ConversationTipification | null;
}) {
  return conversation.latestTipification ?? null;
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
