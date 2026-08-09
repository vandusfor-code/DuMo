import "server-only";
import { commercialPlansService } from "@/services/commercial-plans.service";
import {
  getConversationRepository,
  type ConnectedNumber,
  type IncomingMessage,
} from "@/repositories/conversation.repository";
import { getLeadRepository } from "@/repositories/leads.repository";
import type { ChatMessage, Conversation } from "@/types/conversation";
import type { LatestGestionDraft, Plan, SaveLeadInput } from "@/types/lead";
import type { SaveLeadResult } from "@/types/sales-script";
import type { AdvisorScope } from "@/lib/advisor-scope";
import { saveLeadWithScript } from "@/services/save-lead-with-script";
import { mediaService } from "@/services/media.service";
import {
  defaultPhoneNumberId,
  graphVersion,
  resolveSendCredentials,
} from "@/server/whatsapp/credentials";
import { downloadWhatsAppMedia } from "@/server/whatsapp/media";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import { assertSupportedImageMime } from "@/types/media";
import { normalizeWhatsAppRecipient } from "@/lib/whatsapp/phone";
import {
  isMessengerConversation,
  parseMessengerPsid,
} from "@/lib/messenger/conversation-id";
import { isWebQrConversation } from "@/lib/web-qr/conversation-id";
import { sendWebQrMedia, sendWebQrText, resolveWebQrChannelId } from "@/server/web-qr/send";
import { sendMessengerText } from "@/server/messenger/send";
import { getMessengerIntegrationConfig } from "@/server/messenger/config";

const GRAPH = "https://graph.facebook.com";

function waTo(input: { to: string; conversationId: string }): string {
  return normalizeWhatsAppRecipient(input.to, input.conversationId);
}

export interface SendMessageInput {
  conversationId: string;
  to: string;
  text: string;
  companyId?: string;
}

export interface SendMediaMessageInput {
  conversationId: string;
  to: string;
  mediaUrl: string;
  mimeType: string;
  caption?: string;
  mediaAssetId?: string;
  companyId?: string;
}

async function resolveSendCreds(conversationId: string) {
  const repo = getConversationRepository();
  const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "";
  const convPhoneId = await repo.getSendFromPhoneId(conversationId);

  let phoneId = envPhoneId;
  if (convPhoneId) {
    const connected = await repo.listConnectedPhoneIds().catch(() => [] as string[]);
    const isActive =
      convPhoneId === envPhoneId ||
      (connected.length > 0 && connected.includes(convPhoneId));
    phoneId = isActive ? convPhoneId : envPhoneId || convPhoneId;
  }
  const perNumberToken = phoneId ? await repo.getAccessTokenForPhoneId(phoneId) : null;
  const creds = resolveSendCredentials(phoneId, perNumberToken);
  if ("error" in creds) {
    throw new Error(creds.error);
  }
  return creds;
}

export const leadsService = {
  getConversations(advisorId?: string): Promise<Conversation[]> {
    return getConversationRepository().getConversations(advisorId);
  },
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    return getConversationRepository().getMessages(conversationId);
  },
  markConversationRead(conversationId: string): Promise<void> {
    return getConversationRepository().markRead(conversationId);
  },
  getPlans(): Promise<Plan[]> {
    return commercialPlansService.getAdvisorPlanOptions();
  },
  saveLead(input: SaveLeadInput, scope?: AdvisorScope | null): Promise<SaveLeadResult> {
    return saveLeadWithScript(input, scope);
  },
  getLatestGestionDraft(conversationId: string): Promise<LatestGestionDraft | null> {
    return getLeadRepository().getLatestGestionDraft(conversationId);
  },

  /** Persiste un mensaje entrante recibido por el webhook. */
  async receiveMessage(msg: IncomingMessage): Promise<void> {
    const repo = getConversationRepository();
    const assignedBefore = await repo.getAssignedAdvisorId(msg.conversationId);
    await repo.saveMessage(msg);
    if (msg.direction === "in") {
      const { adminLeadsService } = await import("@/services/admin-leads.service");
      await adminLeadsService.autoAssignIfNeeded(msg.conversationId);
      const assignedAfter = await repo.getAssignedAdvisorId(msg.conversationId);
      if (assignedAfter && !assignedBefore) {
        const { emitLeadsMessageNew, messageNewPayloadFromIncoming } = await import(
          "@/server/realtime/emit"
        );
        emitLeadsMessageNew(messageNewPayloadFromIncoming(msg, assignedAfter));
      }
    }
  },

  /** Descarga imagen de Meta, la guarda en Supabase y persiste el mensaje entrante. */
  async receiveInboundImage(input: {
    waMessageId: string;
    conversationId: string;
    phone: string;
    customerName: string;
    createdAt: string;
    dumoPhoneId?: string;
    waMediaId: string;
    caption?: string;
    mimeType?: string;
    companyId?: string;
  }): Promise<void> {
    const repo = getConversationRepository();
    const companyId = input.companyId ?? DEFAULT_COMPANY_ID;
    const phoneId = input.dumoPhoneId?.trim() || defaultPhoneNumberId() || "";
    const perNumberToken = phoneId ? await repo.getAccessTokenForPhoneId(phoneId) : null;
    const creds = resolveSendCredentials(phoneId, perNumberToken);
    if ("error" in creds) {
      throw new Error(creds.error);
    }

    const downloaded = await downloadWhatsAppMedia({
      mediaId: input.waMediaId,
      token: creds.token,
    });
    const mimeType = input.mimeType ?? downloaded.mimeType;
    assertSupportedImageMime(mimeType);

    const asset = await mediaService.uploadChatMedia({
      companyId,
      conversationId: input.conversationId,
      direction: "inbound",
      fileName: downloaded.fileName ?? `wa-${input.waMediaId}.jpg`,
      mimeType,
      data: downloaded.data,
      waMediaId: input.waMediaId,
    });

    const preview = input.caption?.trim() || "Imagen";

    await this.receiveMessage({
      waMessageId: input.waMessageId,
      conversationId: input.conversationId,
      phone: input.phone,
      customerName: input.customerName,
      body: preview,
      direction: "in",
      createdAt: input.createdAt,
      dumoPhoneId: input.dumoPhoneId,
      messageType: "image",
      mediaAssetId: asset.id,
      caption: input.caption,
      companyId,
    });
  },

  /** Sube imagen al storage propio y la envía por WhatsApp. */
  async sendImageFromUpload(input: {
    conversationId: string;
    to: string;
    fileName: string;
    mimeType: string;
    data: Buffer;
    caption?: string;
    companyId?: string;
    createdBy?: string;
  }): Promise<{ id: string; mediaAssetId: string }> {
    assertSupportedImageMime(input.mimeType);
    const companyId = input.companyId ?? DEFAULT_COMPANY_ID;
    const asset = await mediaService.uploadChatMedia({
      companyId,
      conversationId: input.conversationId,
      direction: "outbound",
      fileName: input.fileName,
      mimeType: input.mimeType,
      data: input.data,
      createdBy: input.createdBy,
    });

    const result = await this.sendMediaMessage({
      conversationId: input.conversationId,
      to: waTo({ to: input.to, conversationId: input.conversationId }),
      mediaUrl: asset.publicUrl,
      mimeType: input.mimeType,
      caption: input.caption,
      mediaAssetId: asset.id,
      companyId,
    });

    return { id: result.id, mediaAssetId: asset.id };
  },

  /** Registra un número conectado a DuMo (lo llama "Conectar con DuMo"). */
  registerNumber(number: ConnectedNumber): Promise<void> {
    return getConversationRepository().registerNumber(number);
  },

  /** Envía un mensaje de texto por WhatsApp o Messenger y lo persiste como saliente. */
  async sendTextMessage(input: SendMessageInput): Promise<{ id: string }> {
    if (isMessengerConversation(input.conversationId)) {
      const psid = parseMessengerPsid(input.conversationId);
      if (!psid) throw new Error("Conversación de Messenger inválida.");
      const sent = await sendMessengerText({ psid, text: input.text });
      const messengerConfig = await getMessengerIntegrationConfig();
      const repo = getConversationRepository();
      await repo.saveMessage({
        waMessageId: sent.id,
        conversationId: input.conversationId,
        phone: psid,
        customerName: "",
        body: input.text,
        direction: "out",
        createdAt: new Date().toISOString(),
        dumoPhoneId: messengerConfig?.pageId,
        messageType: "text",
        companyId: input.companyId,
      });
      return sent;
    }

    if (isWebQrConversation(input.conversationId)) {
      const channelId = await resolveWebQrChannelId(input.conversationId);
      return sendWebQrText({
        channelId,
        conversationId: input.conversationId,
        to: input.to,
        text: input.text,
        companyId: input.companyId,
      });
    }

    const version = graphVersion();
    const repo = getConversationRepository();
    const creds = await resolveSendCreds(input.conversationId);
    const to = waTo({ to: input.to, conversationId: input.conversationId });

    const res = await fetch(`${GRAPH}/${version}/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: input.text },
      }),
    });
    const json = (await res.json()) as {
      messages?: { id?: string }[];
      error?: { message?: string; code?: number };
    };
    if (!res.ok) {
      const hint =
        json.error?.code === 100 || json.error?.message?.includes("does not exist")
          ? " El token no tiene permiso sobre ese phone_number_id."
          : "";
      throw new Error((json.error?.message ?? "Error enviando el mensaje.") + hint);
    }
    const id = json.messages?.[0]?.id ?? `out-${Date.now()}`;

    await repo.saveMessage({
      waMessageId: id,
      conversationId: input.conversationId,
      phone: input.to,
      customerName: "",
      body: input.text,
      direction: "out",
      createdAt: new Date().toISOString(),
      dumoPhoneId: creds.phoneNumberId,
      messageType: "text",
      companyId: input.companyId,
    });
    return { id };
  },

  /** Envía imagen por URL pública (Supabase) y persiste el mensaje. */
  async sendMediaMessage(input: SendMediaMessageInput): Promise<{ id: string }> {
    if (isMessengerConversation(input.conversationId)) {
      throw new Error("El envío de imágenes por Messenger aún no está disponible. Usa texto.");
    }
    if (isWebQrConversation(input.conversationId)) {
      const channelId = await resolveWebQrChannelId(input.conversationId);
      assertSupportedImageMime(input.mimeType);
      return sendWebQrMedia({
        channelId,
        conversationId: input.conversationId,
        to: input.to,
        mediaUrl: input.mediaUrl,
        mimeType: input.mimeType,
        caption: input.caption,
        mediaAssetId: input.mediaAssetId,
        companyId: input.companyId,
      });
    }
    const version = graphVersion();
    const repo = getConversationRepository();
    const creds = await resolveSendCreds(input.conversationId);
    assertSupportedImageMime(input.mimeType);
    const to = waTo({ to: input.to, conversationId: input.conversationId });

    const res = await fetch(`${GRAPH}/${version}/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "image",
        image: {
          link: input.mediaUrl,
          ...(input.caption ? { caption: input.caption } : {}),
        },
      }),
    });
    const json = (await res.json()) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(json.error?.message ?? "Error enviando la imagen.");
    }
    const id = json.messages?.[0]?.id ?? `out-${Date.now()}`;
    const preview = input.caption?.trim() || "Imagen";

    await repo.saveMessage({
      waMessageId: id,
      conversationId: input.conversationId,
      phone: input.to,
      customerName: "",
      body: preview,
      direction: "out",
      createdAt: new Date().toISOString(),
      dumoPhoneId: creds.phoneNumberId,
      messageType: "image",
      mediaAssetId: input.mediaAssetId,
      caption: input.caption,
      companyId: input.companyId,
    });
    return { id };
  },

  /** Envía un mensaje por la Cloud API y lo persiste como saliente. */
  async sendMessage(input: SendMessageInput): Promise<{ id: string }> {
    return this.sendTextMessage(input);
  },
};
