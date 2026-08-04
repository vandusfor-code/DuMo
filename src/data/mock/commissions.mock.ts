import type { Commission } from "@/types/commission";

/** Commission rows — mirrors the Comisiones mockup (Agosto 2025). */
export const COMMISSIONS_MOCK: Commission[] = [
  { id: "COM-00024", saleId: "VTA-2025-00024", customerName: "Juan Sebastián Pérez", date: "2025-08-03", lines: 2, amount: 130000, status: "paid", paymentDate: "2025-08-05" },
  { id: "COM-00025", saleId: "VTA-2025-00025", customerName: "Laura Andrea Gómez", date: "2025-08-03", lines: 1, amount: 65000, status: "paid", paymentDate: "2025-08-05" },
  { id: "COM-00026", saleId: "VTA-2025-00026", customerName: "Carlos Felipe Ramírez", date: "2025-08-03", lines: 1, amount: 65000, status: "pending", paymentDate: null },
  { id: "COM-00023", saleId: "VTA-2025-00023", customerName: "María Paula Torres", date: "2025-08-02", lines: 1, amount: 65000, status: "paid", paymentDate: "2025-08-04" },
  { id: "COM-00022", saleId: "VTA-2025-00022", customerName: "Daniel Camilo Ruiz", date: "2025-08-01", lines: 2, amount: 130000, status: "paid", paymentDate: "2025-08-02" },
  { id: "COM-00021", saleId: "VTA-2025-00021", customerName: "Andrés Valencia", date: "2025-08-01", lines: 1, amount: 65000, status: "pending", paymentDate: null },
  { id: "COM-00020", saleId: "VTA-2025-00020", customerName: "Natalia Rodríguez", date: "2025-08-01", lines: 1, amount: 65000, status: "pending", paymentDate: null },
  { id: "COM-00019", saleId: "VTA-2025-00019", customerName: "Jorge Mario López", date: "2025-08-01", lines: 2, amount: 130000, status: "paid", paymentDate: "2025-08-02" },
];
