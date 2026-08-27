export type LeadFollowUpStatus = "pending" | "completed" | "cancelled" | "transferred";

export type LeadFollowUpModule = "pendientes" | "recuperacion";

export interface LeadFollowUp {
  id: string;
  companyId: string;
  gestionId: string;
  conversationId: string;
  advisorId: string | null;
  advisorName: string;
  originAdvisorId: string | null;
  ownerAdvisorId: string | null;
  module: LeadFollowUpModule;
  customerName: string;
  phone: string;
  tipificationSlug: string;
  followUpDate: string;
  status: LeadFollowUpStatus;
  createdAt: string;
  completedAt: string | null;
}
