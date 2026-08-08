import "server-only";
import { requireAdminSession, type AdminSession } from "@/lib/require-admin";

/** Solo administrador — el módulo QR no es accesible para supervisor ni asesora. */
export async function requireAdministradorSession(): Promise<AdminSession | null> {
  const session = await requireAdminSession();
  if (!session || session.role !== "administrador") return null;
  return session;
}
