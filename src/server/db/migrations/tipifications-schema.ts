import "server-only";
import type postgres from "postgres";
import { DEFAULT_TIPIFICATION_SEEDS } from "@/lib/tipification-seeds";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const TIPIFICATION_REQUIRED_COLUMNS = [
  "tipifications.company_id",
  "tipifications.closes_inbox",
  "tipifications.creates_follow_up",
  "tipifications.follow_up_mode",
  "tipifications.follow_up_default_days",
] as const;

/** Columnas de comportamiento de tipificación (P1.1 — ciclo de vida bandeja / seguimientos). */
export async function runTipificationBehaviorMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    ALTER TABLE tipifications
    ADD COLUMN IF NOT EXISTS closes_inbox boolean NOT NULL DEFAULT false
  `;
  await tx`
    ALTER TABLE tipifications
    ADD COLUMN IF NOT EXISTS creates_follow_up boolean NOT NULL DEFAULT false
  `;
  await tx`
    ALTER TABLE tipifications
    ADD COLUMN IF NOT EXISTS follow_up_mode text NOT NULL DEFAULT 'none'
  `;
  await tx`
    ALTER TABLE tipifications
    ADD COLUMN IF NOT EXISTS follow_up_default_days integer
  `;

  await tx`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tipifications_follow_up_mode_check'
      ) THEN
        ALTER TABLE tipifications ADD CONSTRAINT tipifications_follow_up_mode_check
          CHECK (follow_up_mode IN ('none', 'fixed', 'manual', 'manual_suggested'));
      END IF;
    END $$
  `;

  for (const seed of DEFAULT_TIPIFICATION_SEEDS) {
    await tx`
      UPDATE tipifications
      SET
        closes_inbox = ${seed.closesInbox},
        creates_follow_up = ${seed.createsFollowUp},
        follow_up_mode = ${seed.followUpMode},
        follow_up_default_days = ${seed.followUpDefaultDays},
        updated_at = now()
      WHERE id = ${seed.id}
    `;
  }
}

export async function runTipificationMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    CREATE TABLE IF NOT EXISTS tipifications (
      id text PRIMARY KEY,
      company_id text NOT NULL REFERENCES companies(id),
      slug text NOT NULL,
      name text NOT NULL,
      badge_bg text NOT NULL,
      badge_text text NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      triggers_sale_flow boolean NOT NULL DEFAULT false,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by text NOT NULL DEFAULT 'system'
    )
  `;

  await tx`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_tipifications_company_slug
    ON tipifications (company_id, slug)
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_tipifications_company
    ON tipifications (company_id, status, sort_order)
  `;

  await runTipificationBehaviorMigrations(tx);

  for (const seed of DEFAULT_TIPIFICATION_SEEDS) {
    await tx`
      INSERT INTO tipifications (
        id,
        company_id,
        slug,
        name,
        badge_bg,
        badge_text,
        sort_order,
        triggers_sale_flow,
        closes_inbox,
        creates_follow_up,
        follow_up_mode,
        follow_up_default_days,
        status,
        created_by
      )
      VALUES (
        ${seed.id},
        ${DEFAULT_COMPANY_ID},
        ${seed.slug},
        ${seed.name},
        ${seed.badgeBg},
        ${seed.badgeText},
        ${seed.sortOrder},
        ${seed.triggersSaleFlow},
        ${seed.closesInbox},
        ${seed.createsFollowUp},
        ${seed.followUpMode},
        ${seed.followUpDefaultDays},
        ${seed.status},
        'system'
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}
