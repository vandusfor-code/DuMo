import "server-only";
import type postgres from "postgres";
import { P16_TIPIFICATION_PLAN } from "@/lib/tipification-seeds";
import { TIPIFICATION_BADGE_COLORS } from "@/types/tipification";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

/**
 * P1.6 — actualiza tipificaciones custom in-place e inserta slugs oficiales nuevos.
 * Historial de deuda_wom / deuda_compania_donante no se reasigna (solo comportamiento).
 */
export async function runTipificationP16Migrations(tx: MigrationSql): Promise<void> {
  for (const update of P16_TIPIFICATION_PLAN.updates) {
    await tx`
      UPDATE tipifications
      SET
        closes_inbox = ${update.closesInbox},
        creates_follow_up = ${update.createsFollowUp},
        follow_up_mode = ${update.followUpMode},
        follow_up_default_days = ${update.followUpDefaultDays},
        updated_at = now()
      WHERE id = ${update.id}
        AND company_id = ${DEFAULT_COMPANY_ID}
    `;
  }

  const badge = TIPIFICATION_BADGE_COLORS.in_progress;

  for (const insert of P16_TIPIFICATION_PLAN.inserts) {
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
        ${insert.id},
        ${DEFAULT_COMPANY_ID},
        ${insert.slug},
        ${insert.name},
        ${badge.badgeBg},
        ${badge.badgeText},
        ${insert.sortOrder},
        false,
        ${insert.closesInbox},
        ${insert.createsFollowUp},
        ${insert.followUpMode},
        ${insert.followUpDefaultDays},
        'active',
        'system'
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
  }
}
