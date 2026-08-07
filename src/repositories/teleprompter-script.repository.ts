import "server-only";
import type {
  ScriptFlowKey,
  ScriptTemplateOverride,
  ScriptTemplateVersion,
} from "@/lib/sales-script/cms/types";
import { ensureSchema, getSql, withDbRetry } from "@/server/db/client";

function newId(prefix: string): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("Base de datos no configurada.");
  return sql;
}

function mapOverrideRow(row: Record<string, unknown>): ScriptTemplateOverride {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    flowKey: String(row.flow_key) as ScriptFlowKey,
    blockId: String(row.block_id),
    fieldKey: String(row.field_key),
    templateText: String(row.template_text),
    requiredTokens: Array.isArray(row.required_tokens)
      ? (row.required_tokens as string[])
      : JSON.parse(String(row.required_tokens ?? "[]")),
    isCustom: Boolean(row.is_custom),
    versionNumber: Number(row.version_number) || 1,
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    updatedBy: String(row.updated_by ?? ""),
  };
}

function mapVersionRow(row: Record<string, unknown>): ScriptTemplateVersion {
  return {
    id: String(row.id),
    overrideId: String(row.override_id),
    versionNumber: Number(row.version_number) || 1,
    templateText: String(row.template_text),
    requiredTokens: Array.isArray(row.required_tokens)
      ? (row.required_tokens as string[])
      : JSON.parse(String(row.required_tokens ?? "[]")),
    createdAt: new Date(String(row.created_at)).toISOString(),
    createdBy: String(row.created_by ?? ""),
    changeNote: String(row.change_note ?? ""),
  };
}

export const teleprompterScriptRepository = {
  async listOverridesForFlow(companyId: string, flowKey: ScriptFlowKey): Promise<ScriptTemplateOverride[]> {
    await ensureSchema();
    return withDbRetry(async () => {
      const sql = requireSql();
      const rows = await sql`
        SELECT *
        FROM teleprompter_script_overrides
        WHERE company_id = ${companyId}
          AND flow_key = ${flowKey}
          AND is_custom = true
        ORDER BY block_id ASC, field_key ASC
      `;
      return rows.map((row) => mapOverrideRow(row as Record<string, unknown>));
    });
  },

  async getOverride(
    companyId: string,
    flowKey: ScriptFlowKey,
    blockId: string,
    fieldKey: string,
  ): Promise<ScriptTemplateOverride | null> {
    await ensureSchema();
    return withDbRetry(async () => {
      const sql = requireSql();
      const rows = await sql`
        SELECT *
        FROM teleprompter_script_overrides
        WHERE company_id = ${companyId}
          AND flow_key = ${flowKey}
          AND block_id = ${blockId}
          AND field_key = ${fieldKey}
        LIMIT 1
      `;
      const row = rows[0];
      return row ? mapOverrideRow(row as Record<string, unknown>) : null;
    });
  },

  async saveOverride(input: {
    companyId: string;
    flowKey: ScriptFlowKey;
    blockId: string;
    fieldKey: string;
    templateText: string;
    requiredTokens: string[];
    userId: string;
    changeNote?: string;
  }): Promise<ScriptTemplateOverride> {
    await ensureSchema();
    return withDbRetry(async () => {
      const sql = requireSql();
      const existing = await teleprompterScriptRepository.getOverride(
        input.companyId,
        input.flowKey,
        input.blockId,
        input.fieldKey,
      );

      const nextVersion = (existing?.versionNumber ?? 0) + 1;
      const overrideId = existing?.id ?? newId("tso-");

      await sql`
        INSERT INTO teleprompter_script_overrides (
          id, company_id, flow_key, block_id, field_key,
          template_text, required_tokens, is_custom, version_number, updated_at, updated_by
        )
        VALUES (
          ${overrideId},
          ${input.companyId},
          ${input.flowKey},
          ${input.blockId},
          ${input.fieldKey},
          ${input.templateText},
          ${sql.json(input.requiredTokens)},
          true,
          ${nextVersion},
          now(),
          ${input.userId}
        )
        ON CONFLICT (company_id, flow_key, block_id, field_key)
        DO UPDATE SET
          template_text = EXCLUDED.template_text,
          required_tokens = EXCLUDED.required_tokens,
          is_custom = true,
          version_number = EXCLUDED.version_number,
          updated_at = now(),
          updated_by = EXCLUDED.updated_by
      `;

      const versionId = newId("tsv-");
      await sql`
        INSERT INTO teleprompter_script_override_versions (
          id, override_id, company_id, version_number, template_text,
          required_tokens, created_at, created_by, change_note
        )
        VALUES (
          ${versionId},
          ${overrideId},
          ${input.companyId},
          ${nextVersion},
          ${input.templateText},
          ${sql.json(input.requiredTokens)},
          now(),
          ${input.userId},
          ${input.changeNote ?? "Guardado desde CMS Scripts"}
        )
      `;

      const saved = await teleprompterScriptRepository.getOverride(
        input.companyId,
        input.flowKey,
        input.blockId,
        input.fieldKey,
      );
      if (!saved) throw new Error("No se pudo persistir la plantilla.");
      return saved;
    });
  },

  async restoreOriginal(input: {
    companyId: string;
    flowKey: ScriptFlowKey;
    blockId: string;
    fieldKey: string;
    userId: string;
  }): Promise<void> {
    await ensureSchema();
    await withDbRetry(async () => {
      const sql = requireSql();
      const existing = await teleprompterScriptRepository.getOverride(
        input.companyId,
        input.flowKey,
        input.blockId,
        input.fieldKey,
      );
      if (!existing) return;

      await sql`
        DELETE FROM teleprompter_script_overrides
        WHERE id = ${existing.id}
          AND company_id = ${input.companyId}
      `;

      await sql`
        INSERT INTO teleprompter_script_override_versions (
          id, override_id, company_id, version_number, template_text,
          required_tokens, created_at, created_by, change_note
        )
        VALUES (
          ${newId("tsv-")},
          ${existing.id},
          ${input.companyId},
          ${existing.versionNumber + 1},
          ${existing.templateText},
          ${sql.json(existing.requiredTokens)},
          now(),
          ${input.userId},
          'Restaurado al texto original del builder'
        )
      `;
    });
  },

  async listVersions(companyId: string, overrideId: string): Promise<ScriptTemplateVersion[]> {
    await ensureSchema();
    return withDbRetry(async () => {
      const sql = requireSql();
      const rows = await sql`
        SELECT *
        FROM teleprompter_script_override_versions
        WHERE company_id = ${companyId}
          AND override_id = ${overrideId}
        ORDER BY version_number DESC
      `;
      return rows.map((row) => mapVersionRow(row as Record<string, unknown>));
    });
  },
};

export function hasTeleprompterScriptDatabase(): boolean {
  return Boolean(getSql());
}
