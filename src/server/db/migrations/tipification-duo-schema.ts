import "server-only";
import type postgres from "postgres";
import { DUO_TIPIFICATION_PLAN } from "@/lib/tipification-seeds";
import { TIPIFICATION_BADGE_COLORS } from "@/types/tipification";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const TIPIFICATION_DUO_REQUIRED_COLUMNS = [
  "tipifications.opens_custom_form",
] as const;

/**
 * DUO-1 — agrega el flag `opens_custom_form` (reutilizable por futuras
 * tipificaciones con formulario propio) e inserta "Operación Duo".
 * Aislada de tipifications-schema.ts / P16 para que sea fácil de revisar
 * o revertir sin tocar el resto del catálogo.
 *
 * IMPORTANTE: hace upsert por (company_id, slug), NO por id. Se detectó en
 * producción que el equipo ya había creado a mano una tipificación con
 * slug "operacion_duo" (sin comportamiento) antes de que este código
 * corriera. Un INSERT con ON CONFLICT (id) habría chocado contra el índice
 * único (company_id, slug) — con id distinto no hace match — y fallado en
 * silencio dentro del try/catch de ensureIncrementalMigrations. Por eso se
 * busca primero por slug: si ya existe, solo se actualizan los flags de
 * comportamiento (se respeta el nombre/color que el admin ya haya puesto);
 * si no existe, se inserta con los valores por defecto.
 */
export async function runTipificationDuoMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    ALTER TABLE tipifications
    ADD COLUMN IF NOT EXISTS opens_custom_form boolean NOT NULL DEFAULT false
  `;

  const badge = TIPIFICATION_BADGE_COLORS.in_progress;

  for (const insert of DUO_TIPIFICATION_PLAN.inserts) {
    const existing = await tx<{ id: string }[]>`
      SELECT id FROM tipifications
      WHERE company_id = ${DEFAULT_COMPANY_ID} AND slug = ${insert.slug}
      LIMIT 1
    `;

    if (existing[0]) {
      await tx`
        UPDATE tipifications SET
          triggers_sale_flow = ${insert.triggersSaleFlow},
          closes_inbox = ${insert.closesInbox},
          creates_follow_up = ${insert.createsFollowUp},
          opens_custom_form = ${insert.opensCustomForm},
          follow_up_mode = ${insert.followUpMode},
          follow_up_default_days = ${insert.followUpDefaultDays},
          updated_at = now()
        WHERE id = ${existing[0].id}
      `;
      continue;
    }

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
        opens_custom_form,
        follow_up_mode,
        follow_up_default_days,
        status,
        created_by
      )
      VALUES (
        ${insert.id},
        ${DEFAULT_COMPANY_ID},
        ${insert.slug},
        ${insert.name},
        ${badge.badgeBg},
        ${badge.badgeText},
        ${insert.sortOrder},
        ${insert.triggersSaleFlow},
        ${insert.closesInbox},
        ${insert.createsFollowUp},
        ${insert.opensCustomForm},
        ${insert.followUpMode},
        ${insert.followUpDefaultDays},
        'active',
        'system'
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}
