export type EquipmentStatus = "active" | "inactive";

/** Equipo del catálogo maestro (admin). */
export interface EquipmentCatalogItem {
  id: string;
  commercialName: string;
  brand: string;
  model: string;
  totalValue: number;
  downPayment: number;
  installmentsCount: number;
  installmentValue: number;
  commercialText: string;
  color?: string;
  memory?: string;
  promotions?: string;
  observations?: string;
  status: EquipmentStatus;
}

export type UpsertEquipmentInput = Omit<EquipmentCatalogItem, "id">;

/** Vista reducida para el selector en Gestión (solo activos). */
export interface AdvisorEquipmentOption {
  id: string;
  commercialName: string;
  brand: string;
  model: string;
  totalValue: number;
  downPayment: number;
  installmentsCount: number;
  installmentValue: number;
  /** No se muestra en Gestión; se persiste para el Asistente de Venta. */
  commercialText: string;
}
