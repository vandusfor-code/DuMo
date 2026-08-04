import "server-only";
import { getLeadRepository } from "@/repositories/leads.repository";
import type { ChatMessage, Conversation } from "@/types/conversation";
import type { Lead, Plan, SaveLeadInput } from "@/types/lead";

export const leadsService = {
  getConversations(): Promise<Conversation[]> {
    return getLeadRepository().getConversations();
  },
  getMessages(conversationId: string): Promise<ChatMessage[]> {
    return getLeadRepository().getMessages(conversationId);
  },
  getPlans(): Promise<Plan[]> {
    return getLeadRepository().getPlans();
  },
  saveLead(input: SaveLeadInput): Promise<Lead> {
    return getLeadRepository().saveLead(input);
  },
};
