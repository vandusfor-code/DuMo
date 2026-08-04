/**
 * Formatting helpers. The product targets Chilean advisors (RUT, CLP),
 * so dates and currency use es-CL conventions.
 */

const LONG_DATE = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Parse an ISO date string as a local calendar date (no timezone drift). */
function toDate(iso: string): Date {
  const [datePart] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** "3 de agosto de 2025" — used in tables and detail views. */
export function formatLongDate(iso: string): string {
  return LONG_DATE.format(toDate(iso));
}

/** "03/08/2025" — compact table format with slash separators. */
export function formatShortDate(iso: string): string {
  const date = toDate(iso);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

/** "3 de agosto de 2025, 11:15 a.m." — used in the sale history timeline. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const datePart = LONG_DATE.format(date);
  const timePart = new Intl.DateTimeFormat("es-CL", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${datePart}, ${timePart}`;
}

/** Chilean peso, no decimals: "$1.840.000". */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Initials for avatar chips: "Juan Sebastián Pérez" -> "JS". */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}
