export type ScriptFlowKey =
  | "PORTABILIDAD_SIN_EQUIPO"
  | "PORTABILIDAD_CON_EQUIPO"
  | "LINEA_NUEVA_SIN_EQUIPO"
  | "LINEA_NUEVA_CON_EQUIPO";

export type ScriptBlockField = {
  fieldKey: string;
  label: string;
};

export type ScriptBlockDefinition = {
  blockId: string;
  label: string;
  fields: ScriptBlockField[];
};

export type ScriptFlowCatalog = {
  flowKey: ScriptFlowKey;
  title: string;
  blocks: ScriptBlockDefinition[];
};

export type ScriptTemplateOverride = {
  id: string;
  companyId: string;
  flowKey: ScriptFlowKey;
  blockId: string;
  fieldKey: string;
  templateText: string;
  requiredTokens: string[];
  isCustom: boolean;
  versionNumber: number;
  updatedAt: string;
  updatedBy: string;
};

export type ScriptTemplateVersion = {
  id: string;
  overrideId: string;
  versionNumber: number;
  templateText: string;
  requiredTokens: string[];
  createdAt: string;
  createdBy: string;
  changeNote: string;
};

export type ScriptBlockFieldState = {
  flowKey: ScriptFlowKey;
  blockId: string;
  fieldKey: string;
  label: string;
  defaultTemplate: string;
  requiredTokens: string[];
  currentTemplate: string;
  isCustom: boolean;
  versionNumber: number;
  updatedAt: string | null;
  updatedBy: string | null;
  overrideId: string | null;
};

export type ScriptTemplateValidationIssue = {
  code: "MISSING_REQUIRED_TOKEN" | "INVALID_TOKEN" | "MALFORMED_TOKEN" | "DUPLICATE_TOKEN";
  message: string;
  token?: string;
};

export type ScriptOverrideMap = Record<string, string>;

export function scriptOverrideKey(blockId: string, fieldKey: string): string {
  return `${blockId}::${fieldKey}`;
}

export function parseScriptOverrideKey(key: string): { blockId: string; fieldKey: string } {
  const [blockId, ...rest] = key.split("::");
  return { blockId, fieldKey: rest.join("::") };
}
