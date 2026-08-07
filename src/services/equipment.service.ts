import "server-only";
import { getEquipmentRepository } from "@/repositories/equipment.repository";
import { validateEquipmentCatalogInput } from "@/lib/equipment-catalog";
import type { EquipmentStatus, UpsertEquipmentInput } from "@/types/equipment";

export const equipmentService = {
  listAll() {
    return getEquipmentRepository().listAll();
  },
  listActive() {
    return getEquipmentRepository().listActive();
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
};
