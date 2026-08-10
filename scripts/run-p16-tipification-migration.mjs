#!/usr/bin/env node
/**
 * P1.6 — aplica migración idempotente (updates custom + inserts slugs nuevos).
 * Uso: node --env-file=.env.local scripts/run-p16-tipification-migration.mjs
 */

import postgres from "postgres";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const P16 = {
  updates: [
    {
      id: "tipif-1786266090816-rcnnvl",
      slug: "permanencia",
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual",
      followUpDefaultDays: null,
    },
    {
      id: "tipif-1786266069311-tim48d",
      slug: "deuda_wom",
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual_suggested",
      followUpDefaultDays: 7,
    },
    {
      id: "tipif-1786266123898-r5mu78",
      slug: "deuda_compania_donante",
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual_suggested",
      followUpDefaultDays: 7,
    },
  ],
  inserts: [
    {
      id: "tipif-deuda",
      slug: "deuda",
      name: "Deuda",
      sortOrder: 9,
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual_suggested",
      followUpDefaultDays: 7,
    },
    {
      id: "tipif-sin-cupo",
      slug: "sin_cupo",
      name: "Sin cupo",
      sortOrder: 10,
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual",
      followUpDefaultDays: null,
    },
    {
      id: "tipif-no-responde",
      slug: "no_responde",
      name: "No responde",
      sortOrder: 11,
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "fixed",
      followUpDefaultDays: 2,
    },
    {
      id: "tipif-cliente-indica-fecha",
      slug: "cliente_indica_fecha",
      name: "Cliente indica fecha",
      sortOrder: 12,
      closesInbox: true,
      createsFollowUp: true,
      followUpMode: "manual",
      followUpDefaultDays: null,
    },
  ],
};

const BADGE = { bg: "#EEF4FF", text: "#3538CD" };
const COMPANY = "company-default";

const url =
  process.env.DATABASE_URL1?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  loadRailwayTestDatabaseUrl();

if (!url) {
  console.error("No hay DATABASE_URL en el entorno.");
  process.exit(1);
}

const sql = postgres(url, { ssl: url.includes("localhost") ? false : "require", prepare: false });

try {
  let updated = 0;
  for (const row of P16.updates) {
    const result = await sql`
      UPDATE tipifications
      SET
        closes_inbox = ${row.closesInbox},
        creates_follow_up = ${row.createsFollowUp},
        follow_up_mode = ${row.followUpMode},
        follow_up_default_days = ${row.followUpDefaultDays},
        updated_at = now()
      WHERE id = ${row.id}
        AND company_id = ${COMPANY}
    `;
    updated += result.count;
    console.log(`  update ${row.slug} (${row.id}): ${result.count} fila(s)`);
  }

  let inserted = 0;
  for (const row of P16.inserts) {
    await sql`
      INSERT INTO tipifications (
        id, company_id, slug, name, badge_bg, badge_text, sort_order,
        triggers_sale_flow, closes_inbox, creates_follow_up, follow_up_mode,
        follow_up_default_days, status, created_by
      )
      VALUES (
        ${row.id}, ${COMPANY}, ${row.slug}, ${row.name}, ${BADGE.bg}, ${BADGE.text},
        ${row.sortOrder}, false, ${row.closesInbox}, ${row.createsFollowUp},
        ${row.followUpMode}, ${row.followUpDefaultDays}, 'active', 'system'
      )
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        sort_order = EXCLUDED.sort_order,
        closes_inbox = EXCLUDED.closes_inbox,
        creates_follow_up = EXCLUDED.creates_follow_up,
        follow_up_mode = EXCLUDED.follow_up_mode,
        follow_up_default_days = EXCLUDED.follow_up_default_days,
        updated_at = now()
    `;
    inserted += 1;
    console.log(`  insert/upsert ${row.slug}`);
  }

  console.log(`\nOK — P1.6 migración aplicada (${updated} updates, ${inserted} inserts).`);
} finally {
  await sql.end({ timeout: 5 });
}
