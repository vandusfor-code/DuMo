import "server-only";
import { instagramConversationId } from "@/lib/instagram/conversation-id";
import { assertSupportedAudioMime, assertSupportedImageMime } from "@/types/media";
import { leadsService } from "@/services/leads.service";
import { mediaService } from "@/services/media.service";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import { fetchInstagramProfile } from "@/server/instagram/send";
import { downloadInstagramAttachment } from "@/server/instagram/media";

type InstagramReferral = {
  ref?: string;
  source?: string;
  type?: string;
  ad_id?: string;
};

type InstagramAttachment = {
  type?: string;
  payload?: { url?: string };
};

type InstagramEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: InstagramAttachment[];
    referral?: InstagramReferral;
  };
  referral?: InstagramReferral;
};

function referralSuffix(referral?: InstagramReferral): string {
  if (!referral?.source && !referral?.ad_id && !referral?.ref) return "";
  const parts: string[] = [];
  if (referral.source) parts.push(`origen: ${referral.source}`);
  if (referral.ad_id) parts.push(`ad_id: ${referral.ad_id}`);
  if (referral.ref) parts.push(`ref: ${referral.ref}`);
  return `\n📣 ${parts.join(" · ")}`;
}

function referralBody(referral: InstagramReferral): string {
  if (referral.type === "OPEN_THREAD" && referral.source === "ADS") {
    return `Lead desde anuncio de Instagram${referral.ad_id ? ` (ad_id: ${referral.ad_id})` : ""}`;
  }
  const suffix = referralSuffix(referral);
  return suffix ? `Lead desde Instagram${suffix}` : "Lead desde Instagram";
}

async function persistInstagramMediaInbound(
  event: InstagramEvent,
  igUserId: string,
  attachment: InstagramAttachment,
): Promise<boolean> {
  const igsid = event.sender?.id?.trim();
  const url = attachment.payload?.url?.trim();
  const rawType = attachment.type?.trim().toLowerCase();
  if (!igsid || !url || (igUserId && igsid === igUserId)) return false;
  if (rawType !== "image" && rawType !== "audio") return false;

  const ts = event.timestamp ?? Date.now();
  const mid = event.message?.mid ?? `instagram-media-${igsid}-${ts}`;
  const conversationId = instagramConversationId(igsid);
  const customerName = (await fetchInstagramProfile(igsid)) || `Instagram ${igsid.slice(-6)}`;
  const createdAt = event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString();

  try {
    const downloaded = await downloadInstagramAttachment(url);
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
      fileName: `instagram-${mid}.${ext}`,
      mimeType,
      data: downloaded.data,
    });

    const preview =
      rawType === "image" ? event.message?.text?.trim() || "📷 Imagen" : "🎤 Nota de voz";

    await leadsService.receiveMessage({
      waMessageId: `instagram-${mid}`,
      conversationId,
      phone: igsid,
      customerName,
      body: preview,
      direction: "in",
      createdAt,
      dumoPhoneId: igUserId,
      messageType: rawType === "image" ? "image" : "audio",
      mediaAssetId: asset.id,
      mediaUrl: asset.publicUrl,
      caption: rawType === "image" ? event.message?.text?.trim() : undefined,
    });
    return true;
  } catch (error) {
    console.error("[instagram-inbound] media failed", { mid, rawType, error });
    await leadsService.receiveMessage({
      waMessageId: `instagram-${mid}`,
      conversationId,
      phone: igsid,
      customerName,
      body:
        rawType === "image"
          ? "⚠️ No se pudo recibir la imagen por Instagram."
          : "⚠️ No se pudo recibir el audio por Instagram.",
      direction: "in",
      createdAt,
      dumoPhoneId: igUserId,
      messageType: "text",
    });
    return true;
  }
}

/** Normaliza message / referral (anuncios) a un inbound persistible. */
export function parseInstagramInboundEvent(
  event: InstagramEvent,
  igUserId: string,
): { igsid: string; mid: string; body: string } | null {
  const igsid = event.sender?.id?.trim();
  if (!igsid || (igUserId && igsid === igUserId)) return null;
  if (event.message?.is_echo) return null;

  const ts = event.timestamp ?? Date.now();

  const text = event.message?.text?.trim();
  if (text) {
    return {
      igsid,
      mid: event.message!.mid ?? `instagram-msg-${igsid}-${ts}`,
      body: text + referralSuffix(event.message?.referral ?? event.referral),
    };
  }

  if (event.referral) {
    return {
      igsid,
      mid: `instagram-ref-${igsid}-${ts}`,
      body: referralBody(event.referral),
    };
  }

  return null;
}

export async function persistInstagramInbound(event: InstagramEvent, igUserId: string): Promise<boolean> {
  const attachment = event.message?.attachments?.[0];
  if (attachment?.payload?.url && !event.message?.is_echo) {
    const handled = await persistInstagramMediaInbound(event, igUserId, attachment);
    if (handled) return true;
  }

  const parsed = parseInstagramInboundEvent(event, igUserId);
  if (!parsed) return false;

  const conversationId = instagramConversationId(parsed.igsid);
  const customerName = (await fetchInstagramProfile(parsed.igsid)) || `Instagram ${parsed.igsid.slice(-6)}`;

  await leadsService.receiveMessage({
    waMessageId: `instagram-${parsed.mid}`,
    conversationId,
    phone: parsed.igsid,
    customerName,
    body: parsed.body,
    direction: "in",
    createdAt: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
    dumoPhoneId: igUserId,
    messageType: "text",
  });
  return true;
}
