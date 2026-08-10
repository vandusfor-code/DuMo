export type LeadFollowUpStatus = "pending" | "completed" | "cancelled";

export interface LeadFollowUp {
  id: string;
  companyId: string;
  gestionId: string;
  conversationId: string;
  advisorId: string | null;
  advisorName: string;
  customerName: string;
  phone: string;
  tipificationSlug: string;
  followUpDate: string;
  status: LeadFollowUpStatus;
  createdAt: string;
  completedAt: string | null;
}
