/** Reemplaza {{variable}} en plantillas oficiales. Nunca dejar variables sin resolver. */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function joinLines(lines: string[]): string {
  return lines.filter(Boolean).join("\n\n");
}

export function bulletList(items: string[]): string {
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return "";
  return filtered.map((item) => `• ${item}`).join("\n");
}
