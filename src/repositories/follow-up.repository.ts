import "server-only";
import { getSql, withDbRetry } from "@/server/db/client";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import type { LeadFollowUp, LeadFollowUpStatus } from "@/types/lead-follow-up";

function rowToLeadFollowUp(row: {
  id: string;
  company_id: string;
  gestion_id: string;
  conversation_id: string;
  advisor_id: string | null;
  advisor_name: string;
  origin_advisor_id?: string | null;
  owner_advisor_id?: string | null;
  module?: string;
  customer_name: string;
  phone: string;
  tipification_slug: string;
  follow_up_date: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}): LeadFollowUp {
  return {
    id: row.id,
    companyId: row.company_id,
    gestionId: row.gestion_id,
    conversationId: row.conversation_id,
    advisorId: row.advisor_id,
    advisorName: row.advisor_name,
    originAdvisorId: row.origin_advisor_id ?? row.advisor_id,
    ownerAdvisorId: row.owner_advisor_id ?? null,
    module: (row.module ?? "pendientes") as LeadFollowUp["module"],
    customerName: row.customer_name,
    phone: row.phone,
    tipificationSlug: row.tipification_slug,
    followUpDate: row.follow_up_date,
    status: row.status as LeadFollowUpStatus,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

/** Crea o actualiza la fila de seguimiento a partir de una gestión con follow_up_date. */
export async function upsertFollowUpFromGestion(
  gestionId: string,
  followUpDate?: string | null,
): Promise<boolean> {
  const sql = getSql();
  if (!sql) throw new Error("Base de datos no configurada");

  let resolvedDate = followUpDate?.trim() || null;
  if (!resolvedDate) {
    const gestionRows = await withDbRetry(() =>
      sql<{ follow_up_date: string | null }[]>`
        SELECT follow_up_date::text AS follow_up_date
        FROM lead_gestiones
        WHERE id = ${gestionId}
        LIMIT 1
      `,
    );
    resolvedDate = gestionRows[0]?.follow_up_date?.slice(0, 10) ?? null;
  }

  if (!resolvedDate) return false;

  const result = await withDbRetry(() =>
    sql<{ id: string }[]>`
      INSERT INTO lead_follow_ups (
        id,
        company_id,
        gestion_id,
        conversation_id,
        advisor_id,
        advisor_name,
        origin_advisor_id,
        module,
        customer_name,
        phone,
        tipification_slug,
        follow_up_date,
        status,
        created_at
      )
      SELECT
        g.id,
        ${DEFAULT_COMPANY_ID},
        g.id,
        g.conversation_id,
        g.advisor_id,
        g.advisor_name,
        g.advisor_id,
        'pendientes',
        g.customer_name,
        g.phone,
        g.gestion_type,
        ${resolvedDate}::date,
        'pending',
        now()
      FROM lead_gestiones g
      WHERE g.id = ${gestionId}
      ON CONFLICT (id) DO UPDATE SET
        follow_up_date = EXCLUDED.follow_up_date,
        tipification_slug = EXCLUDED.tipification_slug,
        advisor_id = EXCLUDED.advisor_id,
        advisor_name = EXCLUDED.advisor_name,
        origin_advisor_id = COALESCE(lead_follow_ups.origin_advisor_id, EXCLUDED.origin_advisor_id),
        customer_name = EXCLUDED.customer_name,
        phone = EXCLUDED.phone,
        module = 'pendientes',
        status = 'pending',
        owner_advisor_id = NULL,
        completed_at = NULL
      RETURNING id
    `,
  );

  return Boolean(result[0]?.id);
}

/** Marca el seguimiento activo en Recuperación como completado (P5). */
export async function completeActiveRecuperacionFollowUp(conversationId: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) throw new Error("Base de datos no configurada");

  const result = await withDbRetry(() =>
    sql<{ id: string }[]>`
      UPDATE lead_follow_ups
      SET status = 'completed', completed_at = now()
      WHERE conversation_id = ${conversationId}
        AND module = 'recuperacion'
        AND status <> 'completed'
      RETURNING id
    `,
  );

  return Boolean(result[0]?.id);
}

export async function getFollowUpByGestionId(gestionId: string): Promise<LeadFollowUp | null> {
  const sql = getSql();
  if (!sql) return null;

  const rows = await withDbRetry(() =>
    sql<
      {
        id: string;
        company_id: string;
        gestion_id: string;
        conversation_id: string;
        advisor_id: string | null;
        advisor_name: string;
        customer_name: string;
        phone: string;
        tipification_slug: string;
        follow_up_date: string;
        status: string;
        created_at: string;
        completed_at: string | null;
      }[]
    >`
      SELECT
        id, company_id, gestion_id, conversation_id, advisor_id, advisor_name,
        customer_name, phone, tipification_slug, follow_up_date::text AS follow_up_date,
        status, created_at, completed_at
      FROM lead_follow_ups
      WHERE gestion_id = ${gestionId}
      LIMIT 1
    `,
  );

  const row = rows[0];
  return row ? rowToLeadFollowUp(row) : null;
}
