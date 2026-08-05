import type { ChatMessage } from "./conversation";

export type AdminLeadStatus =
  | "nuevo"
  | "asignado"
  | "contactado"
  | "negociacion"
  | "convertido"
  | "perdido";

export const ADMIN_LEAD_STATUS_LABELS: Record<AdminLeadStatus, string> = {
  nuevo: "Nuevo",
  asignado: "Asignado",
  contactado: "Contactado",
  negociacion: "En negociación",
  convertido: "Convertido",
  perdido: "Perdido",
};

export type AdminLeadFilter = "all" | AdminLeadStatus;

export interface AdminAdvisor {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface AdminConversation {
  id: string;
  customerName: string;
  phone: string;
  rut: string;
  avatarUrl?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  status: AdminLeadStatus;
  online: boolean;
  assignedAdvisor: AdminAdvisor | null;
}

export interface LeadNote {
  id: string;
  conversationId: string;
  text: string;
  createdAt: string;
  author: string;
}

export interface LeadTimelineEvent {
  id: string;
  conversationId: string;
  type: "status_change" | "assignment" | "note" | "message" | "sale";
  title: string;
  detail: string;
  at: string;
  user?: string;
}

export interface ClientProfile {
  salesCount: number;
  linesCount: number;
  firstContact: string;
  lastPurchase: string | null;
  currentStatus: string;
}

export interface AdminLeadDetail {
  conversation: AdminConversation;
  messages: ChatMessage[];
  notes: LeadNote[];
  timeline: LeadTimelineEvent[];
  client: ClientProfile;
}

export interface AssignAdvisorInput {
  conversationId: string;
  advisorId: string;
}

export interface UpsertLeadNoteInput {
  conversationId: string;
  text: string;
  author: string;
}
