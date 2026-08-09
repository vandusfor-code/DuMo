import "server-only";
import { messengerConversationId } from "@/lib/messenger/conversation-id";
import { leadsService } from "@/services/leads.service";
import { fetchMessengerProfile } from "@/server/messenger/send";

type MessengerReferral = {
  ref?: string;
  source?: string;
  type?: string;
  ad_id?: string;
};

type MessengerEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: Array<{ type?: string }>;
    sticker_id?: number;
    referral?: MessengerReferral;
  };
  postback?: {
    title?: string;
    payload?: string;
    mid?: string;
  };
  referral?: MessengerReferral;
};

function referralSuffix(referral?: MessengerReferral): string {
  if (!referral?.source && !referral?.ad_id && !referral?.ref) return "";
  const parts: string[] = [];
  if (referral.source) parts.push(`origen: ${referral.source}`);
  if (referral.ad_id) parts.push(`ad_id: ${referral.ad_id}`);
  if (referral.ref) parts.push(`ref: ${referral.ref}`);
  return `\n📣 ${parts.join(" · ")}`;
}

function messageBody(event: MessengerEvent): string | null {
  const text = event.message?.text?.trim();
  if (text) return text + referralSuffix(event.message?.referral ?? event.referral);

  const attachments = event.message?.attachments ?? [];
  if (attachments.some((item) => item.type === "image")) {
    return "⚠️ DuMo no admite imágenes por Messenger aún. Pide al cliente que envíe texto.";
  }
  if (attachments.some((item) => item.type === "video")) {
    return "⚠️ DuMo no admite videos por Messenger. Pide al cliente que envíe texto.";
  }
  if (attachments.some((item) => item.type === "audio")) {
    return "⚠️ DuMo no admite audios por Messenger. Pide al cliente que envíe texto.";
  }
  if (attachments.some((item) => item.type === "file")) {
    return "⚠️ DuMo no admite archivos por Messenger. Pide al cliente que envíe texto.";
  }
  if (attachments.length > 0) {
    return "⚠️ DuMo no admite este tipo de contenido por Messenger. Pide al cliente que envíe texto.";
  }
  if (event.message?.sticker_id) {
    return "⚠️ DuMo no admite stickers por Messenger. Pide al cliente que envíe texto.";
  }
  return null;
}

function postbackBody(event: MessengerEvent): string | null {
  const pb = event.postback;
  if (!pb) return null;
  const core =
    pb.title?.trim() ||
    pb.payload?.trim() ||
    "Interacción Messenger (postback)";
  return core + referralSuffix(event.referral);
}

function referralBody(referral: MessengerReferral): string {
  if (referral.type === "OPEN_THREAD" && referral.source === "ADS") {
    return `Lead desde anuncio de Messenger${referral.ad_id ? ` (ad_id: ${referral.ad_id})` : ""}`;
  }
  const suffix = referralSuffix(referral);
  return suffix ? `Lead desde Messenger${suffix}` : "Lead desde Messenger";
}

/** Normaliza message / postback / referral (anuncios) a un inbound persistible. */
export function parseMessengerInboundEvent(
  event: MessengerEvent,
  pageId: string,
): { psid: string; mid: string; body: string } | null {
  const psid = event.sender?.id?.trim();
  if (!psid || (pageId && psid === pageId)) return null;
  if (event.message?.is_echo) return null;

  const ts = event.timestamp ?? Date.now();

  const fromMessage = messageBody(event);
  if (fromMessage) {
    return {
      psid,
      mid: event.message!.mid ?? `messenger-msg-${psid}-${ts}`,
      body: fromMessage,
    };
  }

  const fromPostback = postbackBody(event);
  if (fromPostback) {
    return {
      psid,
      mid: event.postback!.mid ?? `messenger-pb-${psid}-${ts}`,
      body: fromPostback,
    };
  }

  if (event.referral) {
    return {
      psid,
      mid: `messenger-ref-${psid}-${ts}`,
      body: referralBody(event.referral),
    };
  }

  return null;
}

export async function persistMessengerInbound(event: MessengerEvent, pageId: string): Promise<boolean> {
  const parsed = parseMessengerInboundEvent(event, pageId);
  if (!parsed) return false;

  const conversationId = messengerConversationId(parsed.psid);
  const customerName =
    (await fetchMessengerProfile(parsed.psid)) || `Messenger ${parsed.psid.slice(-6)}`;

  await leadsService.receiveMessage({
    waMessageId: `messenger-${parsed.mid}`,
    conversationId,
    phone: parsed.psid,
    customerName,
    body: parsed.body,
    direction: "in",
    createdAt: event.timestamp
      ? new Date(event.timestamp).toISOString()
      : new Date().toISOString(),
    dumoPhoneId: pageId,
    messageType: "text",
  });
  return true;
}
