import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const RESPONSE_SLA_REQUIRED_COLUMNS = [
  "response_sla_timers.status",
  "sla_reassignment_log.reason",
] as const;

/**
 * RESP-1 — temporizador de tiempo de respuesta por conversación.
 *
 * `response_sla_timers`: UNA fila por conversación (upsert), representa el
 * estado ACTUAL del temporizador. No es historial — el historial de eventos
 * de reasignación vive en `sla_reassignment_log`. Se arma cuando hay un
 * mensaje `in` sin `out` posterior; se resuelve (`resolved`) en el instante
 * en que la asesora responde. `bullmq_job_id` guarda el id del job diferido
 * activo para poder cancelarlo con precisión al resolver.
 *
 * `sla_reassignment_log`: historial append-only de reasignaciones
 * automáticas por inactividad (o de Escenario C cuando no hubo a quién
 * reasignar). También sirve como reporte de desempeño por asesora
 * (agrupando por original_advisor_id) — no hace falta tabla separada.
 */
export async function runResponseSlaMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    CREATE TABLE IF NOT EXISTS response_sla_timers (
      conversation_id text PRIMARY KEY REFERENCES lead_conversations(id) ON DELETE CASCADE,
      advisor_id text NOT NULL,
      scenario text NOT NULL,
      armed_at timestamptz NOT NULL,
      trigger_message_id text NOT NULL,
      status text NOT NULL DEFAULT 'awaiting_response',
      warning_sent_at timestamptz,
      final_warning_sent_at timestamptz,
      last_admin_alert_at timestamptz,
      escalation_cycle_count integer NOT NULL DEFAULT 0,
      bullmq_job_id text,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await tx`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'response_sla_timers_scenario_check'
      ) THEN
        ALTER TABLE response_sla_timers ADD CONSTRAINT response_sla_timers_scenario_check
          CHECK (scenario IN ('first_contact', 'follow_up'));
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'response_sla_timers_status_check'
      ) THEN
        ALTER TABLE response_sla_timers ADD CONSTRAINT response_sla_timers_status_check
          CHECK (status IN (
            'awaiting_response', 'warning_sent', 'final_warning_sent',
            'threshold_reached', 'escalated_no_advisor', 'reassigned', 'resolved'
          ));
      END IF;
    END $$
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_response_sla_timers_status
    ON response_sla_timers (status)
    WHERE status NOT IN ('resolved', 'reassigned')
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS sla_reassignment_log (
      id text PRIMARY KEY,
      conversation_id text NOT NULL,
      original_advisor_id text NOT NULL,
      original_advisor_name text NOT NULL DEFAULT '',
      new_advisor_id text,
      new_advisor_name text,
      scenario text NOT NULL,
      reason text NOT NULL,
      unanswered_message_id text NOT NULL,
      minutes_unanswered numeric NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_sla_reassignment_log_original_advisor
    ON sla_reassignment_log (original_advisor_id, created_at DESC)
  `;
}
