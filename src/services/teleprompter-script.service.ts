import "server-only";
import type { ScriptBlockFieldState, ScriptFlowKey, ScriptOverrideMap } from "@/lib/sales-script/cms/types";
import {
  buildDefaultTemplateForField,
  buildFlowCatalog,
  getScriptFlowCatalog,
} from "@/lib/sales-script/cms/default-templates";
import { overridesFromRecords } from "@/lib/sales-script/cms/override-applicator";
import {
  extractTokensFromTemplate,
  interpolateTemplate,
  validateScriptTemplate,
} from "@/lib/sales-script/cms/template-utils";
import { previewVarsForFlow } from "@/lib/sales-script/cms/mock-context";
import {
  hasTeleprompterScriptDatabase,
  teleprompterScriptRepository,
} from "@/repositories/teleprompter-script.repository";

export const teleprompterScriptService = {
  listFlows() {
    return getScriptFlowCatalog().map(({ flowKey, title, blocks }) => ({
      flowKey,
      title,
      blockCount: blocks.length,
    }));
  },

  getFlowCatalog(flowKey: ScriptFlowKey) {
    return buildFlowCatalog(flowKey);
  },

  async getFieldState(input: {
    companyId: string;
    flowKey: ScriptFlowKey;
    blockId: string;
    fieldKey: string;
  }): Promise<ScriptBlockFieldState> {
    const catalog = buildFlowCatalog(input.flowKey);
    const block = catalog.blocks.find((item) => item.blockId === input.blockId);
    const field = block?.fields.find((item) => item.fieldKey === input.fieldKey);
    if (!field) {
      throw new Error("Campo editable no encontrado.");
    }

    const defaults = buildDefaultTemplateForField(input);
    if (!hasTeleprompterScriptDatabase()) {
      return {
        flowKey: input.flowKey,
        blockId: input.blockId,
        fieldKey: input.fieldKey,
        label: field.label,
        defaultTemplate: defaults.defaultTemplate,
        requiredTokens: defaults.requiredTokens,
        currentTemplate: defaults.defaultTemplate,
        isCustom: false,
        versionNumber: 0,
        updatedAt: null,
        updatedBy: null,
        overrideId: null,
      };
    }

    const override = await teleprompterScriptRepository.getOverride(
      input.companyId,
      input.flowKey,
      input.blockId,
      input.fieldKey,
    );

    return {
      flowKey: input.flowKey,
      blockId: input.blockId,
      fieldKey: input.fieldKey,
      label: field.label,
      defaultTemplate: defaults.defaultTemplate,
      requiredTokens: defaults.requiredTokens,
      currentTemplate: override?.isCustom ? override.templateText : defaults.defaultTemplate,
      isCustom: Boolean(override?.isCustom),
      versionNumber: override?.versionNumber ?? 0,
      updatedAt: override?.updatedAt ?? null,
      updatedBy: override?.updatedBy ?? null,
      overrideId: override?.id ?? null,
    };
  },

  async saveField(input: {
    companyId: string;
    userId: string;
    flowKey: ScriptFlowKey;
    blockId: string;
    fieldKey: string;
    templateText: string;
  }) {
    const defaults = buildDefaultTemplateForField(input);
    const issues = validateScriptTemplate({
      template: input.templateText,
      requiredTokens: defaults.requiredTokens,
    });
    if (issues.length > 0) {
      return { ok: false as const, issues };
    }

    if (!hasTeleprompterScriptDatabase()) {
      throw new Error("Base de datos no configurada para guardar scripts.");
    }

    const saved = await teleprompterScriptRepository.saveOverride({
      companyId: input.companyId,
      flowKey: input.flowKey,
      blockId: input.blockId,
      fieldKey: input.fieldKey,
      templateText: input.templateText.trim(),
      requiredTokens: extractTokensFromTemplate(defaults.defaultTemplate),
      userId: input.userId,
    });

    return { ok: true as const, saved };
  },

  async restoreField(input: {
    companyId: string;
    userId: string;
    flowKey: ScriptFlowKey;
    blockId: string;
    fieldKey: string;
  }) {
    if (!hasTeleprompterScriptDatabase()) {
      throw new Error("Base de datos no configurada para restaurar scripts.");
    }

    await teleprompterScriptRepository.restoreOriginal(input);
    return teleprompterScriptService.getFieldState(input);
  },

  async listHistory(input: { companyId: string; overrideId: string }) {
    if (!hasTeleprompterScriptDatabase()) return [];
    return teleprompterScriptRepository.listVersions(input.companyId, input.overrideId);
  },

  previewTemplate(templateText: string, flowKey: ScriptFlowKey) {
    return interpolateTemplate(templateText, previewVarsForFlow(flowKey));
  },

  async getOverridesForFlow(companyId: string, flowKey: ScriptFlowKey): Promise<ScriptOverrideMap> {
    if (!hasTeleprompterScriptDatabase()) return {};
    const rows = await teleprompterScriptRepository.listOverridesForFlow(companyId, flowKey);
    return overridesFromRecords(rows);
  },
};
