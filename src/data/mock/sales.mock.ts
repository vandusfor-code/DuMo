import type { SaleDetail, SaleSummary } from "@/types/sale";

/** Sale list rows — mirrors the Mis Ventas mockup. */
export const SALES_SUMMARY_MOCK: SaleSummary[] = [
  { id: "VTA-2025-00024", customerName: "Juan Sebastián Pérez", rut: "10.123.456-7", date: "2025-08-03", lines: 2, status: "completed" },
  { id: "VTA-2025-00025", customerName: "Laura Andrea Gómez", rut: "1.032.456.789-0", date: "2025-08-03", lines: 1, status: "completed" },
  { id: "VTA-2025-00026", customerName: "Carlos Felipe Ramírez", rut: "8.765.432-1", date: "2025-08-03", lines: 1, status: "pending" },
  { id: "VTA-2025-00023", customerName: "María Paula Torres", rut: "1.098.765.432-1", date: "2025-08-02", lines: 1, status: "completed" },
  { id: "VTA-2025-00022", customerName: "Daniel Camilo Ruiz", rut: "1.012.345.678-9", date: "2025-08-01", lines: 2, status: "completed" },
  { id: "VTA-2025-00021", customerName: "Andrés Valencia", rut: "1.234.567.890-1", date: "2025-08-01", lines: 1, status: "cancelled" },
  { id: "VTA-2025-00020", customerName: "Natalia Rodríguez", rut: "1.100.234.567-2", date: "2025-08-01", lines: 1, status: "pending" },
  { id: "VTA-2025-00019", customerName: "Jorge Mario López", rut: "1.045.678.321-3", date: "2025-08-01", lines: 2, status: "completed" },
];

/** Full detail for select sales. VTA-2025-00024 matches the Detalle mockup. */
export const SALE_DETAILS_MOCK: Record<string, SaleDetail> = {
  "VTA-2025-00024": {
    id: "VTA-2025-00024",
    customer: {
      name: "Juan Sebastián Pérez",
      rut: "10.123.456-7",
      phone: "300 123 4567",
      email: "juan.perez@email.com",
    },
    advisor: "María López",
    status: "completed",
    createdAt: "2025-08-03",
    notes:
      "Cliente interesado en plan con más datos móviles.\nPrefiere contacto por WhatsApp.\nEntregar equipo color negro.",
    lines: [
      { phoneNumber: "300 123 4567", saleType: "portability_device", deviceName: "Samsung Galaxy A54 5G", status: "completed" },
      { phoneNumber: "301 765 4321", saleType: "new_line", status: "completed" },
    ],
    history: [
      { title: "Venta creada", user: "María López", datetime: "2025-08-03T11:15:00" },
      { title: "Líneas y equipos agregados", user: "María López", datetime: "2025-08-03T11:16:00" },
      { title: "Venta completada", user: "María López", datetime: "2025-08-03T11:20:00" },
    ],
  },
};

/** Builds a reasonable detail for any sale not explicitly defined above. */
export function buildFallbackDetail(summary: SaleSummary): SaleDetail {
  return {
    id: summary.id,
    customer: {
      name: summary.customerName,
      rut: summary.rut,
      phone: "300 000 0000",
      email: "cliente@email.com",
    },
    advisor: "María López",
    status: summary.status,
    createdAt: summary.date,
    notes: "",
    lines: Array.from({ length: summary.lines }).map((_, i) => ({
      phoneNumber: `30${i} 000 000${i}`,
      saleType: "portability",
      status: summary.status,
    })),
    history: [
      { title: "Venta creada", user: "María López", datetime: `${summary.date}T09:00:00` },
    ],
  };
}
