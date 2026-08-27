import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { getSql } from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RESP-4 — registro consultable de reasignaciones automáticas por
 * inactividad. Sin UI elaborada a propósito (spec del negocio): endpoint
 * JSON con el historial y un resumen por asesora (cuántas veces se le
 * reasignó un chat por no responder a tiempo).
 */
export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ entries: [], summaryByAdvisor: [] });
  }

  try {
    const entries = await sql`
      SELECT id, conversation_id, original_advisor_id, original_advisor_name,
             new_advisor_id, new_advisor_name, scenario, reason,
             unanswered_message_id, minutes_unanswered, created_at
      FROM sla_reassignment_log
      ORDER BY created_at DESC
      LIMIT 500
    `;

    const summaryByAdvisor = await sql`
      SELECT original_advisor_id, original_advisor_name, count(*)::int AS total,
             count(*) FILTER (WHERE new_advisor_id IS NOT NULL)::int AS reassigned_count,
             count(*) FILTER (WHERE new_advisor_id IS NULL)::int AS no_advisor_available_count,
             max(created_at) AS last_occurred_at
      FROM sla_reassignment_log
      GROUP BY original_advisor_id, original_advisor_name
      ORDER BY total DESC
    `;

    return NextResponse.json({ entries, summaryByAdvisor });
  } catch (error) {
    console.error("[GET /api/admin/sla-reassignments]", error);
    return NextResponse.json({ error: "No se pudo cargar el registro." }, { status: 500 });
  }
}
