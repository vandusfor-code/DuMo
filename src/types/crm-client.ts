import type { LeadType } from "@/types/lead";

/** Cliente tipificado o gestionado — base general para asesoras y admin. */
export interface CrmClient {
  id: string;
  conversationId: string;
  customerName: string;
  rut: string;
  phone: string;
  gestionType: string;
  advisorId: string;
  advisorName: string;
  hasSale: boolean;
  /** ISO date yyyy-mm-dd */
  updatedDate: string;
  updatedAt: string;
}

export type CrmClientFilters = {
  search?: string;
  from?: string;
  to?: string;
};

export type SaveLeadAction = "tipify" | "script" | "sale";
