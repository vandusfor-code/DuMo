import "server-only";
import type { AdvisorScope } from "@/lib/advisor-scope";
import { getCommissionsRepository } from "@/repositories/commissions.repository";
import type { Commission } from "@/types/commission";

export const commissionsService = {
  list(month?: string, scope?: AdvisorScope | null): Promise<Commission[]> {
    return getCommissionsRepository().list(month, scope ?? null);
  },
};
