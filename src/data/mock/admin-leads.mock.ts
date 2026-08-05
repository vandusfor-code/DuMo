import type {
  AdminAdvisor,
  AdminConversation,
  ClientProfile,
  LeadNote,
  LeadTimelineEvent,
} from "@/types/admin-lead";
import { getMockMessages } from "./leads.mock";

export const ADMIN_ADVISORS_MOCK: AdminAdvisor[] = [];
export const ADMIN_CONVERSATIONS_MOCK: AdminConversation[] = [];
export const LEAD_NOTES_MOCK: LeadNote[] = [];

export const CLIENT_PROFILES_MOCK: Record<string, ClientProfile> = {};

export function getDefaultClientProfile(_conversationId: string): ClientProfile {
  return {
    salesCount: 0,
    linesCount: 0,
    firstContact: "—",
    lastPurchase: null,
    currentStatus: "Nuevo",
  };
}

export function buildTimeline(conversationId: string): LeadTimelineEvent[] {
  return LEAD_NOTES_MOCK.filter((n) => n.conversationId === conversationId).map((note) => ({
    id: note.id,
    conversationId,
    type: "note" as const,
    title: "Nota interna",
    detail: note.text,
    at: note.createdAt,
    user: note.author,
  }));
}

export { getMockMessages };
