import type { EquipmentCatalogItem } from "@/types/equipment";

const EQUIPMENT_CATALOG_MOCK_SEED: Omit<EquipmentCatalogItem, "carrier">[] = [
  {
    id: "eq-001",
    commercialName: "Samsung Galaxy A36 5G",
    brand: "Samsung",
    model: "Galaxy A36 5G",
    totalValue: 699_990,
    downPayment: 99_990,
    installmentsCount: 18,
    installmentValue: 33_000,
    commercialText:
      "Samsung Galaxy A36 5G con pantalla AMOLED de 6.7\", 256 GB de almacenamiento, cámara de 50 MP y batería de larga duración.",
    isPieCero: false,
    color: "Negro",
    memory: "256 GB",
    status: "active",
  },
  {
    id: "eq-002",
    commercialName: "Motorola Moto G84",
    brand: "Motorola",
    model: "Moto G84",
    totalValue: 549_990,
    downPayment: 79_990,
    installmentsCount: 18,
    installmentValue: 26_110,
    commercialText:
      "Motorola Moto G84 con pantalla pOLED de 6.5\", 256 GB y cámara de 50 MP con estabilización óptica.",
    isPieCero: false,
    color: "Azul",
    memory: "256 GB",
    status: "active",
  },
];

export const EQUIPMENT_CATALOG_MOCK: EquipmentCatalogItem[] = EQUIPMENT_CATALOG_MOCK_SEED.map(
  (item) => ({ ...item, carrier: "wom" }),
);
