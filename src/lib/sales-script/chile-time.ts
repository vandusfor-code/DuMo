const CHILE_TZ = "America/Santiago";

/** Hora local Chile para calcular el saludo automático. */
export function chileLocalHour(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE_TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value;
  return hour ? Number(hour) : now.getHours();
}

/** 06:00–11:59 buenos días · 12:00–19:59 buenas tardes · resto buenas noches. */
export function chileGreeting(now = new Date()): string {
  const h = chileLocalHour(now);
  if (h >= 6 && h < 12) return "Buenos días";
  if (h >= 12 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function chileGreetingWithComma(now = new Date()): string {
  return `${chileGreeting(now)}.`;
}
