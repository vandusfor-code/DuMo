import "server-only";
import { getCommissionsRepository } from "@/repositories/commissions.repository";
import type { Commission } from "@/types/commission";

export const commissionsService = {
  list(month?: string): Promise<Commission[]> {
    return getCommissionsRepository().list(month);
  },
};
