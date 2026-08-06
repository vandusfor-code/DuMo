/** Utilidades de redacción para discurso conversacional en teleprompter. */

/** Une frases en prosa natural: "a, b y c". */
export function joinNaturalList(phrases: string[]): string {
  const clean = phrases.map((p) => p.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} y ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} y ${clean[clean.length - 1]}`;
}

/** Normaliza un ítem de beneficio para insertarlo en una oración (conserva marcas: Apps, WhatsApp). */
export function toBenefitPhrase(item: string): string {
  return item.replace(/^•\s*/, "").replace(/\.$/, "").trim();
}

/**
 * Valor seguro para el discurso: nunca deja huecos visibles.
 * Si falta el dato, devuelve fallback conversacional o cadena vacía para omitir la cláusula.
 */
export function speechValue(
  value: string | undefined | null,
  fallback?: string,
): string {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  return fallback ?? "";
}

/** Construye cláusula opcional — omite si no hay valor ni fallback usable. */
export function optionalClause(template: string, value: string): string {
  if (!value.trim()) return "";
  return template.replace("{value}", value);
}

/** Detecta placeholders sin resolver en el discurso generado. */
export function findUnresolvedPlaceholders(text: string): string[] {
  const issues: string[] = [];
  if (/\{\{[^}]+\}\}/.test(text)) issues.push("variables {{…}} sin resolver");
  if (/\[completar[^\]]*\]/i.test(text)) issues.push("marcadores [completar …]");
  if (/\bundefined\b/i.test(text)) issues.push("texto 'undefined'");
  if (/\bnull\b/i.test(text)) issues.push("texto 'null'");
  if (/\s{2,}[,.]/.test(text)) issues.push("espacios dobles antes de puntuación");
  return issues;
}
