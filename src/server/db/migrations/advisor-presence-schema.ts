import "server-only";
import type postgres from "postgres";
import { ADVISOR_PRESENCE_STATUSES } from "@/lib/advisor-presence";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const ADVISOR_PRESENCE_REQUIRED_COLUMNS = [
  "users.presence_status",
  "users.presence_updated_at",
  "users.presence_updated_by",
  "users.token_version",
] as const;

const PRESENCE_CHECK = ADVISOR_PRESENCE_STATUSES.map((s) => `'${s}'`).join(", ");

export async function runAdvisorPresenceMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS presence_status text NOT NULL DEFAULT 'disponible'
  `;
  await tx`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS presence_updated_at timestamptz
  `;
  await tx`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS presence_updated_by text
  `;
  await tx`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0
  `;

  await tx`
    UPDATE users
    SET presence_status = 'disponible'
    WHERE presence_status IS NULL OR trim(presence_status) = ''
  `;

  await tx`
    UPDATE users
    SET token_version = 0
    WHERE token_version IS NULL
  `;

  await tx.unsafe(`
    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT users_presence_status_check
        CHECK (presence_status IN (${PRESENCE_CHECK}));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await tx`
    CREATE INDEX IF NOT EXISTS idx_users_presence_status
    ON users (role, presence_status, last_seen_at DESC NULLS LAST)
    WHERE role = 'asesora' AND active = true
  `;
}
