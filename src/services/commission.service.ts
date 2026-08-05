import "server-only";
import { getCommissionRepository } from "@/repositories/commission.repository";
import type {
  AdminCommissionDetail,
  AdminCommissionFilters,
  AdminCommissionResult,
} from "@/types/admin-commission";

export const commissionService = {
  list(filters: AdminCommissionFilters): Promise<AdminCommissionResult> {
    return getCommissionRepository().list(filters);
  },
  getDetail(advisorId: string, filters: AdminCommissionFilters): Promise<AdminCommissionDetail> {
    return getCommissionRepository().getDetail(advisorId, filters);
  },
  markPaid(advisorId: string, filters: AdminCommissionFilters): Promise<void> {
    return getCommissionRepository().markPaid(advisorId, filters);
  },
};
