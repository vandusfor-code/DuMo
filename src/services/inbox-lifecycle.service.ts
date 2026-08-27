import "server-only";
import {
  resolveFollowUpDateForSave,
  resolveTipificationBehavior,
  shouldCloseInboxAfterSave,
} from "@/lib/tipification-follow-up";
import {
  completeActiveRecuperacionFollowUp,
  upsertFollowUpFromGestion,
} from "@/repositories/follow-up.repository";
import {
  getConversationInboxState,
  getGestionFollowUpDate,
  setConversationInboxState,
  setGestionFollowUpDate,
  type InboxLifecycleApplyResult,
} from "@/repositories/inbox-lifecycle.repository";
import { getTipificationRepository } from "@/repositories/tipification.repository";
import type { SaveLeadAction } from "@/types/crm-client";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import type { Tipification } from "@/types/tipification";

export type ApplyInboxLifecycleInput = {
  gestionId: string;
  conversationId: string;
  slug: string;
  saveAction: SaveLeadAction;
  followUpDate?: string | null;
  saleRegistered: boolean;
  catalog?: Pick<
    Tipification,
    | "slug"
    | "closesInbox"
    | "createsFollowUp"
    | "followUpMode"
    | "followUpDefaultDays"
    | "triggersSaleFlow"
  >[];
  now?: Date;
};

export async function applyInboxLifecycleAfterSave(
  input: ApplyInboxLifecycleInput,
): Promise<InboxLifecycleApplyResult> {
  const catalog =
    input.catalog ?? (await getTipificationRepository().listActive(DEFAULT_COMPANY_ID));

  const behavior = resolveTipificationBehavior(input.slug, catalog);
  const closeInbox = shouldCloseInboxAfterSave({
    behavior,
    saveAction: input.saveAction,
    saleRegistered: input.saleRegistered,
  });

  let persistedFollowUpDate: string | null = null;
  if (behavior.createsFollowUp) {
    const resolved = resolveFollowUpDateForSave({
      slug: input.slug,
      catalog,
      followUpDate: input.followUpDate,
      now: input.now,
    });
    persistedFollowUpDate = resolved.followUpDate;
    if (resolved.error && input.saveAction === "close") {
      throw new Error(resolved.error);
    }
    await setGestionFollowUpDate(input.gestionId, persistedFollowUpDate);
  } else {
    await setGestionFollowUpDate(input.gestionId, null);
  }

  if (input.saveAction === "close") {
    await completeActiveRecuperacionFollowUp(input.conversationId);
  }

  let followUpCreated = false;
  if (behavior.createsFollowUp && persistedFollowUpDate) {
    followUpCreated = await upsertFollowUpFromGestion(input.gestionId, persistedFollowUpDate);
    if (!followUpCreated) {
      throw new Error("No se pudo registrar el seguimiento en la cola de pendientes.");
    }
  }

  if (closeInbox) {
    await setConversationInboxState(input.conversationId, "closed");
  }

  const inboxState = closeInbox
    ? "closed"
    : ((await getConversationInboxState(input.conversationId)) ?? "active");

  return {
    inboxClosed: closeInbox,
    inboxState,
    followUpDate: persistedFollowUpDate,
    followUpCreated,
  };
}

export {
  getConversationInboxState,
  getGestionFollowUpDate,
};
