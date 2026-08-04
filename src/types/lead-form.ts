import type { LeadSaleType, LeadType } from "./lead";

export interface LeadLineValues {
  phone: string;
  saleType: LeadSaleType | "";
  planId: string;
  equipment: string;
}

/** Shape of the commercial-management form (React Hook Form). */
export interface LeadFormValues {
  customerName: string;
  rut: string;
  phone: string;
  type: LeadType;
  observations: string;
  internalNotes: string;
  lines: LeadLineValues[];
}

export const EMPTY_LEAD_LINE: LeadLineValues = {
  phone: "",
  saleType: "",
  planId: "",
  equipment: "",
};
