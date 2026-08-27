import "server-only";
import { requireAdministradorSession } from "@/lib/require-administrador";
import { getTenantScope } from "@/lib/tenant-scope";
import type { CampaignActor } from "@/services/campaign.service";

/**
 * Campañas es alto blast-radius (mensajería masiva saliente) — mismo
 * criterio que el módulo Web-QR: solo administrador, ni supervisor ni asesora.
 */
export async function requireCampaignActor(): Promise<CampaignActor | null> {
  const session = await requireAdministradorSession();
  if (!session) return null;
  const scope = await getTenantScope();
  if (!scope) return null;
  return { companyId: scope.companyId, userId: session.userId };
}
