import "server-only";
import type { AdvisorScope } from "@/lib/advisor-scope";
import { getCrmClientsRepository } from "@/repositories/crm-clients.repository";
import type { LeadType } from "@/types/lead";
import type { CrmClient, CrmClientFilters } from "@/types/crm-client";

export const crmClientsService = {
  upsertFromGestion(input: {
    conversationId: string;
    customerName: string;
    rut: string;
    phone: string;
    gestionType: string;
    advisorId: string;
    advisorName: string;
    hasSale: boolean;
  }) {
    return getCrmClientsRepository().upsert(input);
  },

  syncFromGestiones(scope: AdvisorScope) {
    return getCrmClientsRepository().syncFromGestiones(scope);
  },

  list(scope: AdvisorScope | null, filters?: CrmClientFilters): Promise<CrmClient[]> {
    return getCrmClientsRepository().list(scope, filters);
  },
};
