import "server-only";
import type postgres from "postgres";
import { NEW_LEAD_TIPIFICATION_PLAN } from "@/lib/tipification-seeds";
import { TIPIFICATION_BADGE_COLORS } from "@/types/tipification";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

/**
 * Inserta la tipificación "Nuevo lead" — estado inicial neutral de toda
 * conversación nueva hasta que se tipifique manualmente (reemplaza el bug
 * de "Venta" quedando preseleccionada por defecto). Mismo patrón defensivo
 * que tipification-duo-schema.ts: upsert por (company_id, slug), no por id,
 * para no chocar si alguien ya la creó a mano en producción.
 */
export async function runTipificationNewLeadMigrations(tx: MigrationSql): Promise<void> {
  const badge = TIPIFICATION_BADGE_COLORS.in_progress;

  for (const insert of NEW_LEAD_TIPIFICATION_PLAN.inserts) {
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
