import type { ScriptTemplateValidationIssue } from "./types";
import { isKnownTeleprompterToken } from "./token-registry";

const TOKEN_PATTERN = /\{\{([a-z0-9_]+)\}\}/g;
const MALFORMED_TOKEN_PATTERN = /\{\{[^}]*\}\}/g;

export function extractTokensFromTemplate(template: string): string[] {
  const tokens: string[] = [];
  for (const match of template.matchAll(TOKEN_PATTERN)) {
    const name = match[1];
    if (name) tokens.push(name);
  }
  return tokens;
}

export function textToTemplate(text: string, vars: Record<string, string>): string {
  const entries = Object.entries(vars)
    .filter(([, value]) => value.trim().length >= 2)
    .sort((a, b) => b[1].length - a[1].length);

  let result = text;
  for (const [key, value] of entries) {
    if (!result.includes(value)) continue;
    result = result.split(value).join(`{{${key}}}`);
  }
  return result;
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(TOKEN_PATTERN, (_full, token: string) => vars[token] ?? `{{${token}}}`);
}

export function validateScriptTemplate(input: {
  template: string;
  requiredTokens: string[];
}): ScriptTemplateValidationIssue[] {
  const issues: ScriptTemplateValidationIssue[] = [];
  const found = extractTokensFromTemplate(input.template);

  for (const required of input.requiredTokens) {
    if (!found.includes(required)) {
      issues.push({
        code: "MISSING_REQUIRED_TOKEN",
        message: `Falta el token obligatorio {{${required}}}.`,
        token: required,
      });
    }
  }

  const malformed = [...input.template.matchAll(MALFORMED_TOKEN_PATTERN)]
    .map((m) => m[0])
    .filter((token) => !/^\{\{[a-z0-9_]+\}\}$/.test(token));

  for (const token of malformed) {
    issues.push({
      code: "MALFORMED_TOKEN",
      message: `Token mal formado: ${token}. Use el formato {{nombre_token}}.`,
      token,
    });
  }

  for (const token of found) {
    if (!isKnownTeleprompterToken(token)) {
      issues.push({
        code: "INVALID_TOKEN",
        message: `Token desconocido {{${token}}}.`,
        token,
      });
    }
  }

  return issues;
}

export function fieldLabelFromPath(path: string): string {
  if (path === "content") return "Discurso principal";
  const leaf = path.split(".").pop() ?? path;
  const labels: Record<string, string> = {
    yesSpeech: "Si el cliente responde Sí",
    noSpeech: "Si el cliente responde No",
    postAudioQuestion: "Pregunta post audio",
    postValidationSpeech: "Tras validación de datos",
    postCondicionesSpeech: "Tras condiciones",
    postQuestionSpeech: "Tras encuesta NPS",
    followUpPrompt: "Seguimiento prefijo 809",
    followUpYesSpeech: "Seguimiento — Sí",
    followUpNoSpeech: "Seguimiento — No",
    consultaSpeech: "Consulta prefijo 809",
  };
  return labels[leaf] ?? leaf.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
