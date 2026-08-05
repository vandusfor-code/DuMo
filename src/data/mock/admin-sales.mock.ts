import type { AdminSale, AdminSaleStatus, AdminSaleType } from "@/types/admin-sale";

/** Las 10 filas exactas del mockup (página 1). */
const EXACT: AdminSale[] = [
  { id: "#VTA-0982", date: "03/08/2025", time: "10:24 am", customerName: "Juan Pérez Gómez", rut: "1.234.567.890", advisor: "María López", type: "portabilidad", plan: "Porta 80GB", womValue: 82000, dumoValue: 82000, status: "registrada", lines: 1 },
  { id: "#VTA-0981", date: "03/08/2025", time: "09:58 am", customerName: "Ana María Torres", rut: "1.098.765.432", advisor: "Laura Torres", type: "renovacion", plan: "Renovación 50GB", womValue: 55000, dumoValue: 55000, status: "en_reparto", lines: 1 },
  { id: "#VTA-0980", date: "03/08/2025", time: "09:41 am", customerName: "Carlos Ramírez", rut: "1.112.223.334", advisor: "Andrea Ruiz", type: "portabilidad", plan: "Porta 50GB", womValue: 72000, dumoValue: 72000, status: "finalizada", lines: 2 },
  { id: "#VTA-0979", date: "03/08/2025", time: "09:15 am", customerName: "Luis Fernando Díaz", rut: "1.556.667.778", advisor: "Carolina Díaz", type: "linea_nueva", plan: "Plan Control 45GB", womValue: 68000, dumoValue: 68000, status: "finalizada", lines: 1 },
  { id: "#VTA-0978", date: "03/08/2025", time: "08:32 am", customerName: "Sofía Martínez", rut: "1.334.445.556", advisor: "Paula Gómez", type: "migracion", plan: "Fibra 300MB", womValue: 140000, dumoValue: 140000, status: "rechazada", lines: 1 },
  { id: "#VTA-0977", date: "03/08/2025", time: "07:50 pm", customerName: "Diego Herrera", rut: "1.998.887.776", advisor: "María López", type: "portabilidad", plan: "Porta 100GB", womValue: 95000, dumoValue: 95000, status: "cancelada", lines: 1 },
  { id: "#VTA-0976", date: "02/08/2025", time: "06:20 pm", customerName: "Valentina Gómez", rut: "1.444.555.666", advisor: "Laura Torres", type: "renovacion", plan: "Renovación 80GB", womValue: 70000, dumoValue: 70000, status: "en_reparto", lines: 1 },
  { id: "#VTA-0975", date: "02/08/2025", time: "05:48 pm", customerName: "Jorge Martínez", rut: "1.777.888.999", advisor: "Andrea Ruiz", type: "linea_nueva", plan: "Plan Control 35GB", womValue: 58000, dumoValue: 58000, status: "registrada", lines: 1 },
  { id: "#VTA-0974", date: "02/08/2025", time: "05:10 pm", customerName: "Camila Ríos", rut: "1.222.333.444", advisor: "Carolina Díaz", type: "portabilidad", plan: "Porta 80GB", womValue: 82000, dumoValue: 82000, status: "finalizada", lines: 1 },
  { id: "#VTA-0973", date: "02/08/2025", time: "04:22 pm", customerName: "Andrés López", rut: "1.666.777.888", advisor: "Paula Gómez", type: "migracion", plan: "Fibra 500MB", womValue: 180000, dumoValue: 180000, status: "en_reparto", lines: 2 },
];

const ADVISORS = ["María López", "Laura Torres", "Andrea Ruiz", "Carolina Díaz", "Paula Gómez", "Sofía Hernández"];
const NAMES = ["Juan Pérez", "Ana Torres", "Carlos Ruiz", "Luis Díaz", "Sofía Martínez", "Diego Herrera", "Valentina Gómez", "Jorge Ramírez", "Camila Ríos", "Andrés López", "Mariana Soto", "Felipe Vega", "Daniela Cruz", "Sebastián Rojas", "Paola Núñez"];
const TYPE_PLANS: Record<AdminSaleType, { plan: string; value: number }[]> = {
  portabilidad: [{ plan: "Porta 50GB", value: 72000 }, { plan: "Porta 80GB", value: 82000 }, { plan: "Porta 100GB", value: 95000 }],
  renovacion: [{ plan: "Renovación 50GB", value: 55000 }, { plan: "Renovación 80GB", value: 70000 }],
  linea_nueva: [{ plan: "Plan Control 35GB", value: 58000 }, { plan: "Plan Control 45GB", value: 68000 }],
  migracion: [{ plan: "Fibra 300MB", value: 140000 }, { plan: "Fibra 500MB", value: 180000 }],
};
const TYPES: AdminSaleType[] = ["portabilidad", "renovacion", "linea_nueva", "migracion"];

// Distribución restante (total - primeras 10) para cuadrar los KPIs:
// registrada 328, en_reparto 159, finalizada 411, rechazada 54, cancelada 30.
const REMAINING: [AdminSaleStatus, number][] = [
  ["registrada", 326],
  ["en_reparto", 156],
  ["finalizada", 408],
  ["rechazada", 53],
  ["cancelada", 29],
];

function pad4(n: number): string {
  return String(n).padStart(4, "0");
}

function buildAll(): AdminSale[] {
  const rows: AdminSale[] = [...EXACT];
  const statuses: AdminSaleStatus[] = [];
  for (const [status, count] of REMAINING) {
    for (let i = 0; i < count; i++) statuses.push(status);
  }

  let id = 972; // desde #VTA-0972 hacia abajo
  for (let i = 0; i < statuses.length; i++, id--) {
    const type = TYPES[i % TYPES.length];
    const pick = TYPE_PLANS[type][i % TYPE_PLANS[type].length];
    const dayOffset = Math.floor(i / 24) + 2; // fechas descendentes
    const d = new Date(2025, 7, 3 - dayOffset);
    const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const hour = 8 + (i % 11);
    const time = `${String(hour > 12 ? hour - 12 : hour).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")} ${hour >= 12 ? "pm" : "am"}`;
    rows.push({
      id: `#VTA-${pad4(id)}`,
      date,
      time,
      customerName: NAMES[i % NAMES.length],
      rut: `1.${String((100 + i) % 900).padStart(3, "0")}.${String((200 + i * 3) % 900).padStart(3, "0")}.${String((300 + i * 7) % 900).padStart(3, "0")}`,
      advisor: ADVISORS[i % ADVISORS.length],
      type,
      plan: pick.plan,
      womValue: pick.value,
      dumoValue: Math.round(pick.value * 0.7),
      status: statuses[i],
      lines: i % 5 === 0 ? 2 : 1,
    });
  }
  return rows;
}

export const ADMIN_SALES_MOCK: AdminSale[] = [];
