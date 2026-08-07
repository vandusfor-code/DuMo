import "server-only";
import type postgres from "postgres";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

/** Columnas nuevas que deben existir para considerar el esquema SaaS/plantillas completo. */
export const QUICK_REPLY_REQUIRED_COLUMNS = [
  "companies.id",
  "users.company_id",
  "quick_reply_categories.company_id",
  "quick_reply_templates.company_id",
  "quick_reply_template_versions.company_id",
  "quick_reply_template_items.company_id",
  "quick_reply_tags.company_id",
  "media_assets.company_id",
  "lead_messages.message_type",
  "lead_messages.media_asset_id",
] as const;

export async function runQuickReplyAndTenantMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    CREATE TABLE IF NOT EXISTS companies (
      id text PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await tx`
    INSERT INTO companies (id, name, slug, status)
    VALUES (${DEFAULT_COMPANY_ID}, 'DuMo', 'dumo', 'active')
    ON CONFLICT (id) DO NOTHING
  `;

  await tx`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id text`;
  await tx`
    UPDATE users SET company_id = ${DEFAULT_COMPANY_ID}
    WHERE company_id IS NULL OR company_id = ''
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS quick_reply_categories (
      id text PRIMARY KEY,
      company_id text NOT NULL REFERENCES companies(id),
      name text NOT NULL,
      slug text NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by text NOT NULL DEFAULT ''
    )
  `;
  await tx`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_categories_company_slug
    ON quick_reply_categories (company_id, slug)
  `;
  await tx`
    CREATE INDEX IF NOT EXISTS idx_qr_categories_company
    ON quick_reply_categories (company_id, status, sort_order)
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS quick_reply_tags (
      id text PRIMARY KEY,
      company_id text NOT NULL REFERENCES companies(id),
      name text NOT NULL,
      slug text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by text NOT NULL DEFAULT ''
    )
  `;
  await tx`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_tags_company_slug
    ON quick_reply_tags (company_id, slug)
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS media_assets (
      id text PRIMARY KEY,
      company_id text NOT NULL REFERENCES companies(id),
      bucket text NOT NULL DEFAULT 'dumo-media',
      storage_path text NOT NULL,
      public_url text NOT NULL,
      file_name text NOT NULL,
      mime_type text NOT NULL,
      size_bytes bigint NOT NULL DEFAULT 0,
      media_kind text NOT NULL DEFAULT 'image',
      source text NOT NULL DEFAULT 'template_upload',
      wa_media_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by text
    )
  `;
  await tx`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_media_assets_storage_path
    ON media_assets (company_id, storage_path)
  `;
  await tx`
    CREATE INDEX IF NOT EXISTS idx_media_assets_company
    ON media_assets (company_id, created_at DESC)
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS quick_reply_templates (
      id text PRIMARY KEY,
      company_id text NOT NULL REFERENCES companies(id),
      category_id text NOT NULL REFERENCES quick_reply_categories(id),
      name text NOT NULL,
      shortcut text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      favorite boolean NOT NULL DEFAULT false,
      times_used integer NOT NULL DEFAULT 0,
      last_used_at timestamptz,
      active_version_id text,
      deleted_at timestamptz,
      deleted_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by text NOT NULL DEFAULT ''
    )
  `;
  await tx`
    CREATE INDEX IF NOT EXISTS idx_qr_templates_company_active
    ON quick_reply_templates (company_id, status)
    WHERE deleted_at IS NULL
  `;
  await tx`
    CREATE INDEX IF NOT EXISTS idx_qr_templates_company_shortcut
    ON quick_reply_templates (company_id, shortcut)
    WHERE deleted_at IS NULL
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS quick_reply_template_versions (
      id text PRIMARY KEY,
      company_id text NOT NULL REFERENCES companies(id),
      template_id text NOT NULL REFERENCES quick_reply_templates(id) ON DELETE CASCADE,
      version_number integer NOT NULL,
      status text NOT NULL DEFAULT 'active',
      change_note text,
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by text NOT NULL DEFAULT ''
    )
  `;
  await tx`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_version_template_number
    ON quick_reply_template_versions (template_id, version_number)
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS quick_reply_template_items (
      id text PRIMARY KEY,
      company_id text NOT NULL REFERENCES companies(id),
      version_id text NOT NULL REFERENCES quick_reply_template_versions(id) ON DELETE CASCADE,
      sort_order integer NOT NULL,
      item_kind text NOT NULL,
      text_body text,
      media_asset_id text REFERENCES media_assets(id),
      caption text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await tx`
    CREATE INDEX IF NOT EXISTS idx_qr_items_version_order
    ON quick_reply_template_items (version_id, sort_order)
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS quick_reply_template_tag_links (
      company_id text NOT NULL REFERENCES companies(id),
      template_id text NOT NULL REFERENCES quick_reply_templates(id) ON DELETE CASCADE,
      tag_id text NOT NULL REFERENCES quick_reply_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (template_id, tag_id)
    )
  `;
  await tx`
    CREATE INDEX IF NOT EXISTS idx_qr_tag_links_company
    ON quick_reply_template_tag_links (company_id, tag_id)
  `;

  await tx`ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'`;
  await tx`ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS media_asset_id text`;
  await tx`ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS caption text`;
  await tx`ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS company_id text`;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_lead_messages_media
    ON lead_messages (media_asset_id)
    WHERE media_asset_id IS NOT NULL
  `;

  await seedDefaultCategories(tx);
}

async function seedDefaultCategories(tx: MigrationSql): Promise<void> {
  const defaults = [
    { name: "Saludos", slug: "saludos", sort: 1 },
    { name: "Planes", slug: "planes", sort: 2 },
    { name: "Equipos", slug: "equipos", sort: 3 },
    { name: "Documentos", slug: "documentos", sort: 4 },
    { name: "Pagos", slug: "pagos", sort: 5 },
    { name: "Despedidas", slug: "despedidas", sort: 6 },
    { name: "Promociones", slug: "promociones", sort: 7 },
  ];

  for (const cat of defaults) {
    await tx`
      INSERT INTO quick_reply_categories (id, company_id, name, slug, sort_order, status, created_by)
      SELECT
        ${`qrcat-${cat.slug}`},
        ${DEFAULT_COMPANY_ID},
        ${cat.name},
        ${cat.slug},
        ${cat.sort},
        'active',
        'system'
      WHERE NOT EXISTS (
        SELECT 1 FROM quick_reply_categories
        WHERE company_id = ${DEFAULT_COMPANY_ID} AND slug = ${cat.slug}
      )
    `;
  }
}
