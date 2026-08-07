import type { SalesScriptStep } from "@/types/sales-script";
import type { ScriptBlockField } from "./types";
import { fieldLabelFromPath } from "./template-utils";

const ADVISOR_NOTE_PATTERN = /advisorNote/i;
const SKIP_KEYS = new Set(["id", "sectionLabel", "title"]);

function collectEditableFields(
  value: unknown,
  path: string,
  out: ScriptBlockField[],
): void {
  if (typeof value === "string") {
    if (path && !ADVISOR_NOTE_PATTERN.test(path)) {
      out.push({ fieldKey: path, label: fieldLabelFromPath(path) });
    }
    return;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (SKIP_KEYS.has(key)) continue;
    const nextPath = path ? `${path}.${key}` : key;
    collectEditableFields(child, nextPath, out);
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
