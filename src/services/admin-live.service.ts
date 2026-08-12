import "server-only";
import { isAdvisorPresenceStatus } from "@/lib/advisor-presence";
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

    const advisor = await getAuthRepository().findById(advisorId);
    if (!advisor?.active || advisor.role !== "asesora") {
      throw new Error("Asesora no encontrada.");
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

    return {
      advisorId,
      presenceStatus: result.presenceStatus,
      updatedAt: result.updatedAt,
      sessionRevoked: result.sessionRevoked,
      tokenVersion: result.tokenVersion,
    };
  },
};
