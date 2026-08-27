import "server-only";
import { getEquipmentRepository } from "@/repositories/equipment.repository";
import { validateEquipmentCatalogInput } from "@/lib/equipment-catalog";
import type { EquipmentBulkImportResult, EquipmentStatus, UpsertEquipmentInput } from "@/types/equipment";

export type { EquipmentBulkImportResult };

async function bulkCreateEquipment(
  items: Array<{ rowNumber: number; equipment: UpsertEquipmentInput }>,
): Promise<EquipmentBulkImportResult> {
  const created: EquipmentBulkImportResult["created"] = [];
  const failed: EquipmentBulkImportResult["failed"] = [];

  for (const item of items) {
    try {
      const error = validateEquipmentCatalogInput(item.equipment);
      if (error) throw new Error(error);
      const row = await getEquipmentRepository().create(item.equipment);
      created.push({
        rowNumber: item.rowNumber,
        id: row.id,
        commercialName: row.commercialName,
      });
    } catch (error) {
      failed.push({
        rowNumber: item.rowNumber,
        error: error instanceof Error ? error.message : "No se pudo crear el equipo.",
      });
    }
  }

  return { created, failed };
}

export const equipmentService = {
  listAll(carrier?: string) {
    return getEquipmentRepository().listAll(carrier);
  },
  listActive(carrier?: string) {
    return getEquipmentRepository().listActive(carrier);
  },
  create(input: UpsertEquipmentInput) {
    const error = validateEquipmentCatalogInput(input);
    if (error) throw new Error(error);
    return getEquipmentRepository().create(input);
  },
  update(id: string, input: UpsertEquipmentInput) {
    const error = validateEquipmentCatalogInput(input);
    if (error) throw new Error(error);
    return getEquipmentRepository().update(id, input);
  },
  setStatus(id: string, status: EquipmentStatus) {
    return getEquipmentRepository().setStatus(id, status);
  },
  delete(id: string) {
    return getEquipmentRepository().delete(id);
  },
  deleteAll() {
    return getEquipmentRepository().deleteAll();
  },
  bulkCreate(
    items: Array<{ rowNumber: number; equipment: UpsertEquipmentInput }>,
  ): Promise<EquipmentBulkImportResult> {
    return bulkCreateEquipment(items);
  },
};
