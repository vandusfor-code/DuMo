import type { SalesScriptStep } from "@/types/sales-script";
import type { ScriptBlockField } from "./types";
import { fieldLabelFromPath } from "./template-utils";

/** Solo texto hablado — nunca notas internas ni metadatos de flujo. */
const ADVISOR_NOTE_PATTERN = /advisorNote/i;
const NON_SPEECH_BRANCH_KEYS = new Set(["referral"]);
const SKIP_KEYS = new Set(["id", "sectionLabel", "title"]);

function isEditableSpeechPath(path: string, parentKey?: string): boolean {
  if (!path || ADVISOR_NOTE_PATTERN.test(path)) return false;
  if (parentKey && NON_SPEECH_BRANCH_KEYS.has(parentKey) && path.includes("advisorNote")) {
    return false;
  }
  return true;
}

function collectEditableFields(
  value: unknown,
  path: string,
  out: ScriptBlockField[],
  parentKey?: string,
): void {
  if (typeof value === "string") {
    if (isEditableSpeechPath(path, parentKey)) {
      out.push({ fieldKey: path, label: fieldLabelFromPath(path) });
    }
    return;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (SKIP_KEYS.has(key)) continue;
    const nextPath = path ? `${path}.${key}` : key;
    collectEditableFields(child, nextPath, out, key);
  }
}

export function extractEditableFieldsFromStep(step: SalesScriptStep): ScriptBlockField[] {
  const fields: ScriptBlockField[] = [];
  collectEditableFields(step.content, "content", fields);
  if (step.branch) {
    collectEditableFields(step.branch, "branch", fields);
  }
  return fields.sort((a, b) => {
    if (a.fieldKey === "content") return -1;
    if (b.fieldKey === "content") return 1;
    return a.fieldKey.localeCompare(b.fieldKey, "es");
  });
}

export function getStepFieldValue(step: SalesScriptStep, fieldKey: string): string | undefined {
  const parts = fieldKey.split(".");
  let current: unknown = step;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function setStepFieldValue(
  step: SalesScriptStep,
  fieldKey: string,
  value: string,
): SalesScriptStep {
  const clone = structuredClone(step);
  const parts = fieldKey.split(".");
  let current: Record<string, unknown> = clone as unknown as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = current[part];
    if (next == null || typeof next !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
  return clone;
}
