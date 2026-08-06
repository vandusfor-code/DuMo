import "server-only";
import { getEquipmentRepository } from "@/repositories/equipment.repository";
import type { EquipmentStatus, UpsertEquipmentInput } from "@/types/equipment";

export const equipmentService = {
  listAll() {
    return getEquipmentRepository().listAll();
  },
  listActive() {
    return getEquipmentRepository().listActive();
  },
  create(input: UpsertEquipmentInput) {
    return getEquipmentRepository().create(input);
  },
  update(id: string, input: UpsertEquipmentInput) {
    return getEquipmentRepository().update(id, input);
  },
  setStatus(id: string, status: EquipmentStatus) {
    return getEquipmentRepository().setStatus(id, status);
  },
  delete(id: string) {
    return getEquipmentRepository().delete(id);
  },
};
