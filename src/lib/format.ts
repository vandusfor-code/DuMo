/**
 * Formatting helpers. Dates/currency use es-CL for sales; chat times use
 * Colombia (America/Bogota) because Vercel runs in UTC and advisors work in CO.
 */

import { DISPLAY_TIMEZONE } from "@/lib/date";

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
  const timePart = new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DISPLAY_TIMEZONE,
  }).format(date);
  return `${datePart}, ${timePart}`;
}

/** yyyy-mm-dd in a given IANA timezone — for same-day checks in chat. */
function calendarDayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Chat time: "8:25 a. m." if today (Colombia), else "dd/mm". */
export function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    calendarDayKey(date, DISPLAY_TIMEZONE) === calendarDayKey(now, DISPLAY_TIMEZONE);
  if (sameDay) {
    return new Intl.DateTimeFormat("es-CO", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: DISPLAY_TIMEZONE,
    }).format(date);
  }
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    timeZone: DISPLAY_TIMEZONE,
  }).format(date);
}

/** Chilean peso, no decimals: "$1.840.000". */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formato entero con separador de miles chileno: 15000 → "15.000". */
export function formatMoneyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CL");
}

/** Parsea valor con puntos de miles: "15.000" → 15000. */
export function parseMoneyInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

/** Initials for avatar chips: "Juan Sebastián Pérez" -> "JS". */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}
