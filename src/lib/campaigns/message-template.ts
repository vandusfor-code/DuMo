/** Variables disponibles en el mensaje — se resuelven contra las columnas mapeadas del archivo. */
const VARIABLE_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

export function extractTemplateVariables(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(VARIABLE_PATTERN)) {
    found.add(match[1]!.toLowerCase());
  }
  return [...found];
}

export interface ResolveMessageResult {
  text: string;
  missingVariables: string[];
}

/**
 * Reemplaza {{variable}} por el valor correspondiente en payload (case-insensitive).
 * Si falta una variable y no hay fallback, NO se envía el literal "{{var}}" —
 * se reporta en missingVariables para que el caller excluya el envío (sección 13).
 */
export function resolveMessageForContact(
  template: string,
  payload: Record<string, unknown>,
  fallbacks: Record<string, string> = {},
): ResolveMessageResult {
  const lowerPayload = new Map<string, unknown>();
  for (const [key, value] of Object.entries(payload)) {
    lowerPayload.set(key.toLowerCase(), value);
  }

  const missingVariables: string[] = [];
  const text = template.replace(VARIABLE_PATTERN, (_match, rawKey: string) => {
    const key = rawKey.toLowerCase();
    const value = lowerPayload.get(key);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
    if (fallbacks[key] !== undefined) {
      return fallbacks[key]!;
    }
    missingVariables.push(key);
    return "";
  });

  return { text, missingVariables };
}
