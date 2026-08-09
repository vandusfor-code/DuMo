/**
 * Business-date helpers anchored to Chile (America/Santiago). Both the server
 * (when writing rows / deriving KPIs) and the client (when filtering by
 * "Hoy"/"Este mes") must agree on what "today" is, regardless of the host
 * timezone — Vercel runs in UTC, so `toISOString()` would roll the date over
 * near midnight and misclassify sales.
 */

const BUSINESS_TZ = "America/Santiago";

/** Zona horaria para mostrar horas en chat y UI operativa (DuMo Colombia). */
export const DISPLAY_TIMEZONE =
  process.env.NEXT_PUBLIC_APP_TIMEZONE?.trim() || "America/Bogota";

// en-CA formats as yyyy-mm-dd, which is exactly the storage format we use.
const ISO_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Current (or given) date as yyyy-mm-dd in Chile business time. */
export function businessDateISO(date: Date = new Date()): string {
  return ISO_DATE_FMT.format(date);
}

/** Current business month as yyyy-mm. */
export function businessMonth(date: Date = new Date()): string {
  return businessDateISO(date).slice(0, 7);
}

/** Previous calendar day in Chile business time (yyyy-mm-dd). */
export function previousBusinessDateISO(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
  return businessDateISO(new Date(utc - 86_400_000));
}

/** Etiqueta legible para UI admin (es-CL). */
export function formatBusinessDateLabel(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const month = new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: BUSINESS_TZ }).format(dt);
  return `${String(d).padStart(2, "0")} de ${month}, ${y}`;
}
