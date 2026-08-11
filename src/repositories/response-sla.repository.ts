import "server-only";
import { ensureSchema, getSql, hasDatabase, withDbRetry } from "@/server/db/client";
import {
  RESPONSE_SLA_THRESHOLDS,
  type ResponseSlaScenario,
  type ResponseSlaStatus,
  type ResponseSlaTimer,
} from "@/types/response-sla";

export interface ArmTimerInput {
  conversationId: string;
  advisorId: string;
  scenario: ResponseSlaScenario;
  triggerMessageId: string;
  bullmqJobId: string | null;
}

export interface ReconcileResult {
  transitioned: boolean;
  previousStatus: ResponseSlaStatus | null;
  newStatus: ResponseSlaStatus | null;
  timer: ResponseSlaTimer | null;
}

export interface ResponseSlaRepository {
  /** true si ya existe algún mensaje saliente en esta conversación (define first_contact vs follow_up). */
  hasPriorOutboundMessage(conversationId: string): Promise<boolean>;
  /** RESP-2 — para el payload del aviso en tiempo real. */
  getCustomerName(conversationId: string): Promise<string>;
  armOrReset(input: ArmTimerInput): Promise<void>;
  /** Marca el timer resuelto (la asesora respondió). Devuelve el jobId activo (si había) para cancelarlo. */
  resolve(
    conversationId: string,
  ): Promise<{ hadActiveTimer: boolean; bullmqJobId: string | null; advisorId: string | null }>;
  getTimer(conversationId: string): Promise<ResponseSlaTimer | null>;
  listActiveConversationIds(): Promise<string[]>;
  /**
   * Relee el estado con FOR UPDATE y avanza la máquina de estados según el
   * tiempo transcurrido — regla de desempate B: gana siempre lo que hay en
   * la fila en este instante, nunca la intención con la que se disparó el
   * job/barrido que llamó a esta función.
   */
  reconcileOne(conversationId: string): Promise<ReconcileResult>;
}

function mapRow(r: Record<string, unknown>): ResponseSlaTimer {
  return {
    conversationId: String(r.conversation_id),
    advisorId: String(r.advisor_id),
    scenario: r.scenario as ResponseSlaScenario,
    armedAt: new Date(r.armed_at as string).toISOString(),
    triggerMessageId: String(r.trigger_message_id),
    status: r.status as ResponseSlaStatus,
    warningSentAt: r.warning_sent_at ? new Date(r.warning_sent_at as string).toISOString() : null,
    finalWarningSentAt: r.final_warning_sent_at
      ? new Date(r.final_warning_sent_at as string).toISOString()
      : null,
    lastAdminAlertAt: r.last_admin_alert_at
      ? new Date(r.last_admin_alert_at as string).toISOString()
      : null,
    escalationCycleCount: Number(r.escalation_cycle_count) || 0,
    bullmqJobId: (r.bullmq_job_id as string | null) ?? null,
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

const TERMINAL_STATUSES: ResponseSlaStatus[] = ["resolved", "reassigned"];

/** Próximo estado según escenario + estado actual + minutos transcurridos desde armed_at. */
function nextStatusFor(
  scenario: ResponseSlaScenario,
  current: ResponseSlaStatus,
  elapsedMinutes: number,
): ResponseSlaStatus | null {
  const t = RESPONSE_SLA_THRESHOLDS[scenario];

  if (current === "awaiting_response" && elapsedMinutes >= t.warningMinutes) {
    return "warning_sent";
  }
  if (
    current === "warning_sent" &&
    t.finalWarningMinutes !== null &&
    elapsedMinutes >= t.finalWarningMinutes
  ) {
    return "final_warning_sent";
  }
  const readyForEscalation =
    (current === "warning_sent" && t.finalWarningMinutes === null) ||
    current === "final_warning_sent";
  if (readyForEscalation && elapsedMinutes >= t.escalateMinutes) {
    return "threshold_reached";
  }
  return null;
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

class MockResponseSlaRepository implements ResponseSlaRepository {
  async hasPriorOutboundMessage(): Promise<boolean> {
    return false;
  }
  async getCustomerName(): Promise<string> {
    return "";
  }
  async armOrReset(): Promise<void> {}
  async resolve(): Promise<{ hadActiveTimer: boolean; bullmqJobId: string | null; advisorId: string | null }> {
    return { hadActiveTimer: false, bullmqJobId: null, advisorId: null };
  }
  async getTimer(): Promise<ResponseSlaTimer | null> {
    return null;
  }
  async listActiveConversationIds(): Promise<string[]> {
    return [];
  }
  async reconcileOne(): Promise<ReconcileResult> {
    return { transitioned: false, previousStatus: null, newStatus: null, timer: null };
  }
}

class PostgresResponseSlaRepository implements ResponseSlaRepository {
  async hasPriorOutboundMessage(conversationId: string): Promise<boolean> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<{ n: number }[]>`
        SELECT 1 AS n FROM lead_messages
        WHERE conversation_id = ${conversationId} AND direction = 'out'
        LIMIT 1
      `,
    );
    return rows.length > 0;
  }

  async getCustomerName(conversationId: string): Promise<string> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<{ customer_name: string }[]>`
        SELECT customer_name FROM lead_conversations WHERE id = ${conversationId} LIMIT 1
      `,
    );
    return rows[0]?.customer_name ?? "";
  }

  async armOrReset(input: ArmTimerInput): Promise<void> {
    await ensureSchema();
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        INSERT INTO response_sla_timers (
          conversation_id, advisor_id, scenario, armed_at, trigger_message_id,
          status, bullmq_job_id, updated_at
        ) VALUES (
          ${input.conversationId}, ${input.advisorId}, ${input.scenario}, now(),
          ${input.triggerMessageId}, 'awaiting_response', ${input.bullmqJobId}, now()
        )
        ON CONFLICT (conversation_id) DO UPDATE SET
          advisor_id = EXCLUDED.advisor_id,
          scenario = EXCLUDED.scenario,
          armed_at = EXCLUDED.armed_at,
          trigger_message_id = EXCLUDED.trigger_message_id,
          status = 'awaiting_response',
          warning_sent_at = NULL,
          final_warning_sent_at = NULL,
          escalation_cycle_count = 0,
          bullmq_job_id = EXCLUDED.bullmq_job_id,
          updated_at = now()
      `,
    );
  }

  async resolve(
    conversationId: string,
  ): Promise<{ hadActiveTimer: boolean; bullmqJobId: string | null; advisorId: string | null }> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<{ status: string; bullmq_job_id: string | null; advisor_id: string }[]>`
        UPDATE response_sla_timers
        SET status = 'resolved', bullmq_job_id = NULL, updated_at = now()
        WHERE conversation_id = ${conversationId}
          AND status NOT IN ('resolved', 'reassigned')
        RETURNING status, bullmq_job_id, advisor_id
      `,
    );
    const row = rows[0];
    return {
      hadActiveTimer: Boolean(row),
      bullmqJobId: row?.bullmq_job_id ?? null,
      advisorId: row?.advisor_id ?? null,
    };
  }

  async getTimer(conversationId: string): Promise<ResponseSlaTimer | null> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql`SELECT * FROM response_sla_timers WHERE conversation_id = ${conversationId} LIMIT 1`,
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    return row ? mapRow(row) : null;
  }

  async listActiveConversationIds(): Promise<string[]> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<{ conversation_id: string }[]>`
        SELECT conversation_id FROM response_sla_timers
        WHERE status NOT IN ('resolved', 'reassigned')
      `,
    );
    return rows.map((r) => r.conversation_id);
  }

  async reconcileOne(conversationId: string): Promise<ReconcileResult> {
    await ensureSchema();
    const sql = requireSql();

    return sql.begin(async (tx) => {
      const rows = await tx`
        SELECT * FROM response_sla_timers WHERE conversation_id = ${conversationId} FOR UPDATE
      `;
      const row = rows[0] as Record<string, unknown> | undefined;
      if (!row) {
        return { transitioned: false, previousStatus: null, newStatus: null, timer: null };
      }
      const timer = mapRow(row);
      if (TERMINAL_STATUSES.includes(timer.status)) {
        return { transitioned: false, previousStatus: timer.status, newStatus: null, timer };
      }

      const elapsedMinutes = (Date.now() - new Date(timer.armedAt).getTime()) / 60_000;

      // Avanza tantos umbrales como corresponda en una sola pasada — si el
      // barrido/worker estuvo caído y el tiempo saltó de golpe varios
      // minutos, no debe quedar a medio camino esperando otra vuelta.
      let current = timer.status;
      let passedWarning = false;
      let passedFinalWarning = false;
      let next: ResponseSlaStatus | null = null;
      for (let i = 0; i < 5; i++) {
        const candidate = nextStatusFor(timer.scenario, current, elapsedMinutes);
        if (!candidate) break;
        if (candidate === "warning_sent") passedWarning = true;
        if (candidate === "final_warning_sent") passedFinalWarning = true;
        current = candidate;
        next = candidate;
      }

      if (!next) {
        return { transitioned: false, previousStatus: timer.status, newStatus: null, timer };
      }

      const updatedRows = await tx`
        UPDATE response_sla_timers SET
          status = ${next},
          warning_sent_at = CASE WHEN ${passedWarning} THEN now() ELSE warning_sent_at END,
          final_warning_sent_at = CASE WHEN ${passedFinalWarning} THEN now() ELSE final_warning_sent_at END,
          updated_at = now()
        WHERE conversation_id = ${conversationId}
        RETURNING *
      `;
      const updated = mapRow(updatedRows[0] as Record<string, unknown>);
      return { transitioned: true, previousStatus: timer.status, newStatus: next, timer: updated };
    });
  }
}

export function getResponseSlaRepository(): ResponseSlaRepository {
  return hasDatabase() ? new PostgresResponseSlaRepository() : new MockResponseSlaRepository();
}
