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
