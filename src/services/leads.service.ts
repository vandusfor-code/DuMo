import "server-only";
import { getLeadRepository } from "@/repositories/leads.repository";
import {
  getConversationRepository,
  type ConnectedNumber,
  type IncomingMessage,
} from "@/repositories/conversation.repository";
import type { ChatMessage, Conversation } from "@/types/conversation";
import type { Lead, Plan, SaveLeadInput } from "@/types/lead";
import { graphVersion, resolveSendCredentials } from "@/server/whatsapp/credentials";

const GRAPH = "https://graph.facebook.com";

export interface SendMessageInput {
  conversationId: string;
  to: string;
  text: string;
}

export const leadsService = {
  getConversations(): Promise<Conversation[]> {
    return getConversationRepository().getConversations();
  },
  getMessages(conversationId: string): Promise<ChatMessage[]> {
    const repo = getConversationRepository();
    void repo.markRead(conversationId);
    return repo.getMessages(conversationId);
  },
  getPlans(): Promise<Plan[]> {
    return getLeadRepository().getPlans();
  },
  saveLead(input: SaveLeadInput): Promise<Lead> {
    return getLeadRepository().saveLead(input);
  },

  /** Persiste un mensaje entrante recibido por el webhook. */
  receiveMessage(msg: IncomingMessage): Promise<void> {
    return getConversationRepository().saveMessage(msg);
  },

  /** Registra un número conectado a DuMo (lo llama "Conectar con DuMo"). */
  registerNumber(number: ConnectedNumber): Promise<void> {
    return getConversationRepository().registerNumber(number);
  },

  /** Envía un mensaje por la Cloud API y lo persiste como saliente. */
  async sendMessage(input: SendMessageInput): Promise<{ id: string }> {
    const version = graphVersion();
    const repo = getConversationRepository();
    const phoneId =
      (await repo.getSendFromPhoneId(input.conversationId)) ??
      process.env.WHATSAPP_PHONE_NUMBER_ID ??
      "";
    const perNumberToken = phoneId ? await repo.getAccessTokenForPhoneId(phoneId) : null;
    const creds = resolveSendCredentials(phoneId, perNumberToken);
    if ("error" in creds) {
      throw new Error(creds.error);
    }

    const res = await fetch(`${GRAPH}/${version}/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.to,
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
          ? " El token no tiene permiso sobre ese phone_number_id — usa el mismo token permanente que dulabs (meta_permanent_token) o un System User con acceso al WABA."
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
    });
    return { id };
  },
};
