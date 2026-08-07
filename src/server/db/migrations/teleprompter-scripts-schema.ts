import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const TELEPROMPTER_SCRIPT_REQUIRED_COLUMNS = [
  "teleprompter_script_overrides.company_id",
  "teleprompter_script_override_versions.company_id",
] as const;

export async function runTeleprompterScriptMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    CREATE TABLE IF NOT EXISTS teleprompter_script_overrides (
      id text PRIMARY KEY,
      company_id text NOT NULL REFERENCES companies(id),
      flow_key text NOT NULL,
      block_id text NOT NULL,
      field_key text NOT NULL,
      template_text text NOT NULL,
      required_tokens jsonb NOT NULL DEFAULT '[]'::jsonb,
      is_custom boolean NOT NULL DEFAULT true,
      version_number integer NOT NULL DEFAULT 1,
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by text NOT NULL DEFAULT ''
    )
  `;

  await tx`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_teleprompter_script_overrides_key
    ON teleprompter_script_overrides (company_id, flow_key, block_id, field_key)
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_teleprompter_script_overrides_flow
    ON teleprompter_script_overrides (company_id, flow_key)
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS teleprompter_script_override_versions (
      id text PRIMARY KEY,
      override_id text NOT NULL REFERENCES teleprompter_script_overrides(id) ON DELETE CASCADE,
      company_id text NOT NULL REFERENCES companies(id),
      version_number integer NOT NULL,
      template_text text NOT NULL,
      required_tokens jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by text NOT NULL DEFAULT '',
      change_note text NOT NULL DEFAULT ''
    )
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_teleprompter_script_override_versions_override
    ON teleprompter_script_override_versions (override_id, version_number DESC)
  `;
}
