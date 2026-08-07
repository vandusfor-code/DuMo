import "server-only";

import { generateOfferAlternatives } from "@/lib/offer-engine/offer-engine";
import { getOfferSimulationRepository } from "@/repositories/offer-simulation.repository";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import { getEquipmentRepository } from "@/repositories/equipment.repository";
import type { AuthUser } from "@/types/auth";
import type {
  OfferGenerationResult,
  OfferSimulationHistoryItem,
  OfferSimulationRecord,
  OfferSimulationRequest,
} from "@/types/offer-engine";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";

function companyFromUser(user: AuthUser): string {
  return user.companyId ?? DEFAULT_COMPANY_ID;
}

export const offerEngineService = {
  async simulate(
    input: OfferSimulationRequest,
    user: AuthUser,
  ): Promise<OfferSimulationRecord> {
    if (input.requestedLines < 1 || input.requestedLines > 5) {
      throw new Error("La cantidad de líneas debe estar entre 1 y 5.");
    }
    if (input.lineCredit <= 0) {
      throw new Error("El cupo línea móvil es obligatorio.");
    }

    const [{ plans }, equipmentCatalog] = await Promise.all([
      getCommercialConfigurationRepository().getSnapshot(),
      getEquipmentRepository().listAll(),
    ]);

    const result = generateOfferAlternatives(input, plans, equipmentCatalog);
    if (result.alternatives.length === 0) {
      throw new Error("No hay planes activos en el catálogo comercial.");
    }

    return getOfferSimulationRepository().insert(input, result, {
      companyId: companyFromUser(user),
      createdBy: user.id,
      createdByName: user.name,
    });
  },

  async history(leadId: string, user: AuthUser): Promise<OfferSimulationHistoryItem[]> {
    return getOfferSimulationRepository().listByLead(leadId, companyFromUser(user));
  },

  async getSimulation(id: string, user: AuthUser): Promise<OfferSimulationRecord | null> {
    return getOfferSimulationRepository().getById(id, companyFromUser(user));
  },
};

export type { OfferGenerationResult };
