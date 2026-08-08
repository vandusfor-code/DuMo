import "server-only";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { defaultPhoneNumberId } from "@/server/whatsapp/credentials";

/** IDs explícitos en WHATSAPP_PHONE_NUMBER_IDS (coma-separados). Vacío = sin filtro por env. */
export function phoneIdsFromEnv(): string[] {
  return (process.env.WHATSAPP_PHONE_NUMBER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Lista de phone_number_id aceptados en webhooks directos de Meta.
 * Vacío = acepta todos.
 *
 * Reenvíos desde dulabs omiten el filtro: dulabs ya validó forward_to_dumo.
 * Si WHATSAPP_PHONE_NUMBER_IDS está definido, se amplía con números conectados
 * en BD y WHATSAPP_PHONE_NUMBER_ID para no bloquear números nuevos (p. ej. Portate).
 */
export async function resolveAllowedPhoneIds(skipFilter: boolean): Promise<string[]> {
  if (skipFilter) return [];

  const fromEnv = phoneIdsFromEnv();
  if (fromEnv.length === 0) return [];

  const repo = getConversationRepository();
  const connected = await repo.listConnectedPhoneIds().catch(() => [] as string[]);
  const defaultId = defaultPhoneNumberId();

  return [
    ...new Set([...fromEnv, ...connected, ...(defaultId ? [defaultId] : [])]),
  ];
}
