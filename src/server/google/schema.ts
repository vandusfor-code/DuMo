import "server-only";

/**
 * Canonical spreadsheet schema. This is the single source of truth for the
 * tabs and column headers DuMo expects. The GoogleSheetsClient provisions the
 * spreadsheet from this definition on first run (idempotently).
 *
 * Column order here defines the physical column order when a header row is
 * first written. Reads map by header NAME, so later re-ordering is tolerated.
 */

export type TabName =
  | "Usuarios"
  | "Ventas"
  | "LineasVenta"
  | "Comisiones"
  | "Configuracion"
  | "Logs"
  | "Leads"
  | "LineasLead"
  | "Planes";

export interface TabSchema {
  name: TabName;
  headers: string[];
}

export const SHEET_SCHEMA: TabSchema[] = [
  {
    name: "Usuarios",
    headers: ["id", "nombre", "cargo", "email", "avatarUrl"],
  },
  {
    name: "Ventas",
    headers: [
      "id",
      "cliente",
      "rut",
      "telefono",
      "email",
      "asesora",
      "estado", // completed | pending | cancelled
      "fecha", // yyyy-mm-dd
      "plan", // plan vendido (opcional)
      "notas",
      "creadoEn", // ISO datetime
    ],
  },
  {
    name: "LineasVenta",
    headers: [
      "id",
      "ventaId",
      "numeroLinea",
      "tipoVenta", // portability | portability_device | device_renewal | new_line | migration
      "equipo",
      "estado",
    ],
  },
  {
    name: "Comisiones",
    headers: [
      "id",
      "ventaId",
      "cliente",
      "fecha", // yyyy-mm-dd
      "lineas",
      "monto",
      "estado", // paid | pending
      "fechaPago", // yyyy-mm-dd | ""
    ],
  },
  {
    name: "Configuracion",
    headers: ["clave", "valor"],
  },
  {
    name: "Logs",
    headers: ["id", "fecha", "nivel", "mensaje", "contexto"],
  },
  {
    name: "Leads",
    headers: [
      "id",
      "conversationId",
      "telefono",
      "cliente",
      "rut",
      "tipoGestion", // venta | consulta | ...
      "asesora",
      "notas",
      "creadoEn",
    ],
  },
  {
    name: "LineasLead",
    headers: ["id", "leadId", "numeroLinea", "tipoVenta", "plan", "equipo"],
  },
  {
    name: "Planes",
    headers: ["id", "nombre"],
  },
];

/** Default plans seeded when the Planes tab is first created. */
export const DEFAULT_PLANS: [string, string][] = [
  ["xs", "Plan XS"],
  ["s", "Plan S"],
  ["m", "Plan M"],
  ["l", "Plan L"],
  ["xl", "Plan XL"],
  ["fibra", "Fibra Hogar"],
  ["prepago", "Prepago"],
  ["postpago", "Postpago"],
];

/** Well-known keys stored in the Configuracion tab. */
export const CONFIG_KEYS = {
  dailyGoal: "meta_ventas_dia",
  monthlyGoal: "meta_ventas_mes",
  commissionPerLine: "comision_por_linea",
  nextPaymentDate: "proximo_pago_estimado",
} as const;

/** Default configuration seeded when the Configuracion tab is first created. */
export const DEFAULT_CONFIG: Record<string, string> = {
  [CONFIG_KEYS.dailyGoal]: "15",
  [CONFIG_KEYS.monthlyGoal]: "300",
  [CONFIG_KEYS.commissionPerLine]: "65000",
  [CONFIG_KEYS.nextPaymentDate]: "",
};
