import "server-only";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import type { AuthRole } from "@/types/auth";

export type TenantScope = {
  companyId: string;
  userId: string;
  role: AuthRole;
  userName: string;
};

/** Resuelve el tenant del usuario autenticado para filtrar consultas. */
export async function getTenantScope(): Promise<TenantScope | null> {
  return resolveTenantScope(false);
}

/** Área asesora: solo cookie httpOnly — no Bearer de localStorage. */
export async function getAdvisorTenantScope(): Promise<TenantScope | null> {
  return resolveTenantScope(true);
}

async function resolveTenantScope(cookieOnly: boolean): Promise<TenantScope | null> {
  const { getCookieSessionToken, getSessionToken } = await import("@/lib/require-admin");
  const token = cookieOnly ? await getCookieSessionToken() : await getSessionToken();
  if (!token) return null;

  const { verifySessionToken } = await import("@/lib/auth/session-cookie");
  const { verifySessionTokenEdge } = await import("@/lib/auth/session-edge");
  const payload = verifySessionToken(token) ?? (await verifySessionTokenEdge(token));
  if (!payload?.role) return null;

  const { authService } = await import("@/services/auth.service");
  const user = await authService.getSessionUserFromToken(token);
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
