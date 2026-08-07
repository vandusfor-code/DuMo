import "server-only";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import type { AuthRole } from "@/types/auth";
import { getTokenPayload } from "@/lib/require-admin";
import { authService } from "@/services/auth.service";

export type TenantScope = {
  companyId: string;
  userId: string;
  role: AuthRole;
  userName: string;
};

/** Resuelve el tenant del usuario autenticado para filtrar consultas. */
export async function getTenantScope(): Promise<TenantScope | null> {
  const payload = await getTokenPayload();
  if (!payload?.role) return null;

  const user = await authService.getSessionUser();
  if (!user?.active) return null;

  return {
    companyId: user.companyId ?? payload.companyId ?? DEFAULT_COMPANY_ID,
    userId: user.id,
    role: user.role,
    userName: user.name,
  };
}

export function assertTenantCompanyId(companyId: string, scope: TenantScope): void {
  if (companyId !== scope.companyId) {
    throw new Error("No autorizado para acceder a recursos de otra empresa.");
  }
}
