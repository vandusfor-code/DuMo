import "server-only";
import type postgres from "postgres";
import { DEFAULT_TIPIFICATION_SEEDS } from "@/lib/tipification-seeds";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const TIPIFICATION_REQUIRED_COLUMNS = ["tipifications.company_id"] as const;

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
        ${seed.status},
        'system'
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}
