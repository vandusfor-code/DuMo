import "server-only";
import { buildPresenceChangeAlertMessage, isAdvisorPresenceStatus } from "@/lib/advisor-presence";
import { getAuthRepository } from "@/repositories/auth.repository";
import { getAdvisorPresenceRepository } from "@/repositories/advisor-presence.repository";
import type { AdvisorPresenceUpdateResult, LiveSnapshot } from "@/types/admin-live";

export const adminLiveService = {
  getSnapshot(selectedDate?: string): Promise<LiveSnapshot> {
    return getAdvisorPresenceRepository().getLiveSnapshot(selectedDate);
  },

  async setAdvisorPresence(
    advisorId: string,
    rawStatus: string,
    updatedBy: string,
    options?: { revokeSessionOnDisconnect?: boolean },
  ): Promise<AdvisorPresenceUpdateResult> {
    const status = rawStatus.trim().toLowerCase();
    if (!isAdvisorPresenceStatus(status)) {
      throw new Error("Estado de presencia inválido.");
    }

    // No se restringe a role==='asesora': el selector de presencia también
    // aplica a admin/supervisor. El enrutamiento de leads (round-robin, SLA)
    // sigue filtrando por role='asesora' en su propia consulta, así que esto
    // no afecta el reparto aunque un admin se marque "disponible".
    const advisor = await getAuthRepository().findById(advisorId);
    if (!advisor?.active) {
      throw new Error("Usuario no encontrado.");
    }

    const result = await getAdvisorPresenceRepository().setPresence(
      advisorId,
      status,
      updatedBy,
      options,
    );

    if (result.sessionRevoked) {
      const { emitSessionRevoked } = await import("@/server/realtime/emit");
      emitSessionRevoked(advisorId, "presence:desconectado");
    }

    const { emitPresenceChanged } = await import("@/server/realtime/emit");
    emitPresenceChanged(advisorId);

    // Notifica a Monica/Duvan por WhatsApp cada cambio de estado — incluye
    // los que dispara el propio sistema (barrido por inactividad, cierre de
    // pestaña) para que se note cuando alguien "quedó pegada" sin marcarse.
    const { sendSlaAdminAlert } = await import("@/server/web-qr/admin-alerts");
    const message = buildPresenceChangeAlertMessage({
      advisorName: advisor.name,
      status,
      auto: updatedBy.startsWith("system:"),
    });
    await sendSlaAdminAlert(message).catch((err) =>
      console.error("[setAdvisorPresence] sendSlaAdminAlert", err),
    );

    return {
      advisorId,
      presenceStatus: result.presenceStatus,
      updatedAt: result.updatedAt,
      sessionRevoked: result.sessionRevoked,
      tokenVersion: result.tokenVersion,
    };
  },
};
