import "server-only";
import { getLeadRepository } from "@/repositories/leads.repository";
import {
  getConversationRepository,
  type IncomingMessage,
} from "@/repositories/conversation.repository";
import type { ChatMessage, Conversation } from "@/types/conversation";
import type { Lead, Plan, SaveLeadInput } from "@/types/lead";

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

  /** Envía un mensaje por la Cloud API y lo persiste como saliente. */
  async sendMessage(input: SendMessageInput): Promise<{ id: string }> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const version = process.env.WHATSAPP_GRAPH_VERSION ?? "v21.0";
    if (!token || !phoneId) {
      throw new Error("Faltan WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID.");
    }

    const res = await fetch(`${GRAPH}/${version}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
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
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(json.error?.message ?? "Error enviando el mensaje.");
    }
    const id = json.messages?.[0]?.id ?? `out-${Date.now()}`;

    await getConversationRepository().saveMessage({
      waMessageId: id,
      conversationId: input.conversationId,
      phone: input.to,
      customerName: "",
      body: input.text,
      direction: "out",
      createdAt: new Date().toISOString(),
    });
    return { id };
  },
};
