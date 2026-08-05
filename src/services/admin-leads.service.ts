import "server-only";
import { getLeadRepository } from "@/repositories/leads.repository";
import type {
  AdminAdvisor,
  AdminConversation,
  AdminLeadDetail,
  AssignAdvisorInput,
  ClientProfile,
  LeadNote,
  UpsertLeadNoteInput,
} from "@/types/admin-lead";
import type { ChatMessage } from "@/types/conversation";
import type { Lead, Plan, SaveLeadInput } from "@/types/lead";

export const adminLeadsService = {
  listConversations(): Promise<AdminConversation[]> {
    return getLeadRepository().listAdminConversations();
  },
  getDetail(conversationId: string): Promise<AdminLeadDetail> {
    return getLeadRepository().getAdminDetail(conversationId);
  },
  listAdvisors(): Promise<AdminAdvisor[]> {
    return getLeadRepository().listAdvisors();
  },
  assignAdvisor(input: AssignAdvisorInput): Promise<AdminConversation> {
    return getLeadRepository().assignAdvisor(input);
  },
  getMessages(conversationId: string): Promise<ChatMessage[]> {
    return getLeadRepository().getMessages(conversationId);
  },
  listNotes(conversationId: string): Promise<LeadNote[]> {
    return getLeadRepository().listNotes(conversationId);
  },
  addNote(input: UpsertLeadNoteInput): Promise<LeadNote> {
    return getLeadRepository().addNote(input);
  },
  updateNote(id: string, text: string): Promise<LeadNote> {
    return getLeadRepository().updateNote(id, text);
  },
  deleteNote(id: string): Promise<void> {
    return getLeadRepository().deleteNote(id);
  },
  getClientProfile(conversationId: string): Promise<ClientProfile> {
    return getLeadRepository().getClientProfile(conversationId);
  },
  getPlans(): Promise<Plan[]> {
    return getLeadRepository().getPlans();
  },
  saveLead(input: SaveLeadInput): Promise<Lead> {
    return getLeadRepository().saveLead(input);
  },
};
