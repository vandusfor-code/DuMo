import "server-only";
import { getSalesReconciliationRepository } from "@/repositories/sales-reconciliation.repository";
import { salesService } from "@/services/sales.service";
import { mapLeadLineToSaleType } from "@/lib/lead-save";
import type { OrphanSaleGestion } from "@/types/sales-reconciliation";
import type { NewSaleInput } from "@/types/sale";
import type { LeadSaleType, EquipmentMode } from "@/types/lead";

export const salesReconciliationService = {
  listOrphanGestiones(): Promise<OrphanSaleGestion[]> {
    return getSalesReconciliationRepository().listOrphanGestiones();
  },

  /**
   * Registra la venta real a partir de lo que quedó guardado en la gestión,
   * atribuida a la asesora ORIGINAL (no a quien hace la reconciliación).
   * Reutiliza salesService.create — el mismo camino que ya usa el flujo
   * normal, no uno paralelo.
   */
  async registerFromGestion(
    gestion: OrphanSaleGestion,
    resolvedBy: string,
  ): Promise<{ saleId: string }> {
    if (!gestion.advisorId) {
      throw new Error("La gestión no tiene asesora asociada — no se puede registrar.");
    }
    if (gestion.lines.length === 0) {
      throw new Error("La gestión no tiene líneas guardadas.");
    }

    const saleInput: NewSaleInput = {
      customerName: gestion.customerName,
      rut: gestion.rut,
      phone: gestion.phone,
      email: gestion.lines.find((l) => l.email?.trim())?.email || undefined,
      notes: "Reconciliada manualmente desde una gestión huérfana (bug de saveAction ya corregido).",
      lines: gestion.lines.map((line) => ({
        phoneNumber: line.phone,
        saleType: mapLeadLineToSaleType(
          line.saleType as LeadSaleType,
          (line.equipmentMode as EquipmentMode) ?? "none",
        ),
        planId: line.planId?.trim() || undefined,
        deviceName: line.equipment?.trim() || undefined,
      })),
    };

    const sale = await salesService.create(saleInput, {
      id: gestion.advisorId,
      name: gestion.advisorName,
    });

    await getSalesReconciliationRepository().markResolved({
      gestionId: gestion.gestionId,
      status: "registered",
      resolvedSaleId: sale.id,
      resolvedBy,
    });

    return { saleId: sale.id };
  },

  async dismiss(gestionId: string, resolvedBy: string): Promise<void> {
    await getSalesReconciliationRepository().markResolved({
      gestionId,
      status: "dismissed",
      resolvedSaleId: null,
      resolvedBy,
    });
  },
};
