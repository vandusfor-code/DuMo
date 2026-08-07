import "server-only";
import type { AuthRole } from "@/types/auth";
import { getTokenPayload } from "@/lib/require-admin";

export type AdministratorSession = {
  userId: string;
  role: AuthRole;
  companyId?: string;
};

/** Solo administrador — supervisores y asesoras no administran plantillas. */
export async function requireAdministratorSession(): Promise<AdministratorSession | null> {
  const payload = await getTokenPayload();
  if (!payload?.role || payload.role !== "administrador") return null;
  return {
    userId: payload.userId,
    role: payload.role as AuthRole,
    companyId: payload.companyId,
  };
}
