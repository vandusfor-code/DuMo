import "server-only";
import { getAdminLeadsRepository } from "@/repositories/admin-leads.repository";
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
    return getAdminLeadsRepository().listConversations();
  },
  listConversationsForAdvisor(advisorId: string): Promise<AdminConversation[]> {
    return getAdminLeadsRepository().listConversationsForAdvisor(advisorId);
  },
  getDetail(conversationId: string): Promise<AdminLeadDetail> {
    return getAdminLeadsRepository().getDetail(conversationId);
  },
  listAdvisors(): Promise<AdminAdvisor[]> {
    return getAdminLeadsRepository().listAdvisors();
  },
  assignAdvisor(input: AssignAdvisorInput): Promise<AdminConversation> {
    return getAdminLeadsRepository().assignAdvisor(input);
  },
  getMessages(conversationId: string): Promise<ChatMessage[]> {
    return getAdminLeadsRepository().getMessages(conversationId);
  },
  listNotes(conversationId: string): Promise<LeadNote[]> {
    return getAdminLeadsRepository().listNotes(conversationId);
  },
  addNote(input: UpsertLeadNoteInput): Promise<LeadNote> {
    return getAdminLeadsRepository().addNote(input);
  },
  updateNote(id: string, text: string): Promise<LeadNote> {
    return getAdminLeadsRepository().updateNote(id, text);
  },
  deleteNote(id: string): Promise<void> {
    return getAdminLeadsRepository().deleteNote(id);
  },
  getClientProfile(conversationId: string): Promise<ClientProfile> {
    return getAdminLeadsRepository().getDetail(conversationId).then((d) => d.client);
  },
  getPlans(): Promise<Plan[]> {
    return getLeadRepository().getPlans();
  },
  saveLead(input: SaveLeadInput): Promise<Lead> {
    return getLeadRepository().saveLead(input);
  },
  getAutoAssignSettings() {
    return getAdminLeadsRepository().getAutoAssignSettings();
  },
  setAutoAssignEnabled(enabled: boolean) {
    return getAdminLeadsRepository().setAutoAssignEnabled(enabled);
  },
  autoAssignIfNeeded(conversationId: string) {
    return getAdminLeadsRepository().autoAssignIfNeeded(conversationId);
  },
  autoAssignAllPending(options?: { skipThrottle?: boolean }) {
    return getAdminLeadsRepository().autoAssignAllPending(options);
  },
  deleteConversation(conversationId: string) {
    return getAdminLeadsRepository().deleteConversation(conversationId);
  },
  deleteAllConversations() {
    return getAdminLeadsRepository().deleteAllConversations();
  },
};
