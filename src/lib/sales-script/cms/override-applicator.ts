import type { ScriptBuildContext } from "@/lib/sales-script/context";
import type { SalesScriptStep } from "@/types/sales-script";
import type { ScriptOverrideMap } from "./types";
import { getStepFieldValue, setStepFieldValue } from "./field-utils";
import { interpolateTemplate } from "./template-utils";
import { parseScriptOverrideKey, scriptOverrideKey } from "./types";

export function applyScriptOverrides(input: {
  steps: SalesScriptStep[];
  vars: Record<string, string>;
  overrides: ScriptOverrideMap;
}): SalesScriptStep[] {
  if (Object.keys(input.overrides).length === 0) return input.steps;

  return input.steps.map((step) => {
    let next = step;
    for (const [key, template] of Object.entries(input.overrides)) {
      const { blockId, fieldKey } = parseScriptOverrideKey(key);
      if (blockId !== step.id) continue;
      const current = getStepFieldValue(next, fieldKey);
      if (current == null) continue;
      const resolved = interpolateTemplate(template, input.vars);
      next = setStepFieldValue(next, fieldKey, resolved);
    }
    return next;
  });
}

export function overridesFromRecords(
  records: Array<{ blockId: string; fieldKey: string; templateText: string }>,
): ScriptOverrideMap {
  const map: ScriptOverrideMap = {};
  for (const record of records) {
    map[scriptOverrideKey(record.blockId, record.fieldKey)] = record.templateText;
  }
  return map;
}

export function applyPortabilidadOverrides(
  steps: SalesScriptStep[],
  ctx: ScriptBuildContext,
  overrides: ScriptOverrideMap,
): SalesScriptStep[] {
  return applyScriptOverrides({ steps, vars: ctx.vars, overrides });
}

export function applyLineaNuevaOverrides(
  steps: SalesScriptStep[],
  vars: Record<string, string>,
  overrides: ScriptOverrideMap,
): SalesScriptStep[] {
  return applyScriptOverrides({ steps, vars, overrides });
}
