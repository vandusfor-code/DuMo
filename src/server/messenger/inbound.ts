import "server-only";
import { messengerConversationId } from "@/lib/messenger/conversation-id";
import { assertSupportedAudioMime, assertSupportedImageMime } from "@/types/media";
import { leadsService } from "@/services/leads.service";
import { mediaService } from "@/services/media.service";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import { fetchMessengerProfile } from "@/server/messenger/send";
import { downloadMessengerAttachment } from "@/server/messenger/media";

type MessengerReferral = {
  ref?: string;
  source?: string;
  type?: string;
  ad_id?: string;
};

type MessengerAttachment = {
  type?: string;
  payload?: { url?: string };
};

type MessengerEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: MessengerAttachment[];
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

async function persistMessengerMediaInbound(
  event: MessengerEvent,
  pageId: string,
  attachment: MessengerAttachment,
): Promise<boolean> {
  const psid = event.sender?.id?.trim();
  const url = attachment.payload?.url?.trim();
  const rawType = attachment.type?.trim().toLowerCase();
  if (!psid || !url || (pageId && psid === pageId)) return false;
  if (rawType !== "image" && rawType !== "audio") return false;

  const ts = event.timestamp ?? Date.now();
  const mid = event.message?.mid ?? `messenger-media-${psid}-${ts}`;
  const conversationId = messengerConversationId(psid);
  const customerName =
    (await fetchMessengerProfile(psid)) || `Messenger ${psid.slice(-6)}`;
  const createdAt = event.timestamp
    ? new Date(event.timestamp).toISOString()
    : new Date().toISOString();

  try {
    const downloaded = await downloadMessengerAttachment(url);
    const mimeType = downloaded.mimeType;
    if (rawType === "image") {
      assertSupportedImageMime(mimeType);
    } else {
      assertSupportedAudioMime(mimeType);
    }

    const ext = rawType === "image" ? "jpg" : "ogg";
    const asset = await mediaService.uploadChatMedia({
      companyId: DEFAULT_COMPANY_ID,
      conversationId,
      direction: "inbound",
      fileName: `messenger-${mid}.${ext}`,
      mimeType,
      data: downloaded.data,
    });

    const preview =
      rawType === "image"
        ? event.message?.text?.trim() || "📷 Imagen"
        : "🎤 Nota de voz";

    await leadsService.receiveMessage({
      waMessageId: `messenger-${mid}`,
      conversationId,
      phone: psid,
      customerName,
      body: preview,
      direction: "in",
      createdAt,
      dumoPhoneId: pageId,
      messageType: rawType === "image" ? "image" : "audio",
      mediaAssetId: asset.id,
      mediaUrl: asset.publicUrl,
      caption: rawType === "image" ? event.message?.text?.trim() : undefined,
    });
    return true;
  } catch (error) {
    console.error("[messenger-inbound] media failed", { mid, rawType, error });
    await leadsService.receiveMessage({
      waMessageId: `messenger-${mid}`,
      conversationId,
      phone: psid,
      customerName,
      body:
        rawType === "image"
          ? "⚠️ No se pudo recibir la imagen por Messenger."
          : "⚠️ No se pudo recibir el audio por Messenger.",
      direction: "in",
      createdAt,
      dumoPhoneId: pageId,
      messageType: "text",
    });
    return true;
  }
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

  const text = event.message?.text?.trim();
  if (text) {
    return {
      psid,
      mid: event.message!.mid ?? `messenger-msg-${psid}-${ts}`,
      body: text + referralSuffix(event.message?.referral ?? event.referral),
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
  const attachment = event.message?.attachments?.[0];
  if (attachment?.payload?.url && !event.message?.is_echo) {
    const handled = await persistMessengerMediaInbound(event, pageId, attachment);
    if (handled) return true;
  }

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
