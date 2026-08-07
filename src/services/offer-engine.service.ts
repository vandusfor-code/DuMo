import "server-only";

import { assertPlansExist, calculateOffer } from "@/lib/offer-engine/offer-engine";
import { getOfferSimulationRepository } from "@/repositories/offer-simulation.repository";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import { getEquipmentRepository } from "@/repositories/equipment.repository";
import type { AuthUser } from "@/types/auth";
import type {
  OfferRecommendation,
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
    validateRequestShape(input);

    const [{ plans: allPlans }, equipmentCatalog] = await Promise.all([
      getCommercialConfigurationRepository().getSnapshot(),
      getEquipmentRepository().listAll(),
    ]);

    const plans = new Map(allPlans.map((p) => [p.id, p]));
    const planIds = [
      input.mainPlanId,
      ...input.additionalPlans.map((p) => p.planId),
    ];
    const planError = assertPlansExist(planIds, plans);
    if (planError) throw new Error(planError);

    let equipment = null;
    if (input.equipmentId) {
      equipment = equipmentCatalog.find((e) => e.id === input.equipmentId) ?? null;
      if (!equipment) throw new Error("Equipo no encontrado en el catálogo.");
      if (equipment.status !== "active") {
        throw new Error("El equipo seleccionado no está disponible.");
      }
    }

    const recommendation = calculateOffer(input, { plans, equipment });
    return getOfferSimulationRepository().insert(input, recommendation, {
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

function validateRequestShape(input: OfferSimulationRequest): void {
  const expectedAdditional = input.requestedLines - 1;
  if (expectedAdditional < 0 || expectedAdditional > 4) {
    throw new Error("Cantidad de líneas inválida.");
  }
  if (input.additionalPlans.length !== expectedAdditional) {
    throw new Error("La cantidad de planes adicionales no coincide con las líneas solicitadas.");
  }
  if (input.requestedLines < 1) {
    throw new Error("Debe solicitar al menos una línea.");
  }
}

export type { OfferRecommendation };
