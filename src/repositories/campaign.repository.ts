import "server-only";
import { ensureSchema, getSql, withDbRetry } from "@/server/db/client";
import type {
  Campaign,
  CampaignContact,
  CampaignContactStatus,
  CampaignEvent,
  CampaignEventType,
  CampaignSettingsInput,
  CampaignStatus,
  CampaignSuppression,
} from "@/types/campaign";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("Base de datos no configurada.");
  return sql;
}

function mapCampaignRow(r: Record<string, unknown>): Campaign {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    name: String(r.name),
    description: String(r.description ?? ""),
    status: String(r.status) as CampaignStatus,
    messageTemplate: String(r.message_template ?? ""),
    provider: String(r.provider ?? "mock"),
    intervalSeconds: Number(r.interval_seconds) || 60,
    concurrency: Number(r.concurrency) || 1,
    maxRetries: Number(r.max_retries) || 0,
    totalContacts: Number(r.total_contacts) || 0,
    eligibleContacts: Number(r.eligible_contacts) || 0,
    sentCount: Number(r.sent_count) || 0,
    failedCount: Number(r.failed_count) || 0,
    excludedCount: Number(r.excluded_count) || 0,
    responseCount: Number(r.response_count) || 0,
    optOutCount: Number(r.opt_out_count) || 0,
    riskStatus: r.risk_status === "auto_paused" ? "auto_paused" : "ok",
    riskReason: r.risk_reason ? String(r.risk_reason) : null,
    consecutiveFailures: Number(r.consecutive_failures) || 0,
    currentJobId: r.current_job_id ? String(r.current_job_id) : null,
    createdBy: String(r.created_by ?? ""),
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
    startedAt: r.started_at ? new Date(String(r.started_at)).toISOString() : null,
    pausedAt: r.paused_at ? new Date(String(r.paused_at)).toISOString() : null,
    finishedAt: r.finished_at ? new Date(String(r.finished_at)).toISOString() : null,
  };
}

function mapContactRow(r: Record<string, unknown>): CampaignContact {
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    companyId: String(r.company_id),
    rawPayload: (r.raw_payload as Record<string, unknown>) ?? {},
    name: String(r.name ?? ""),
    phone: String(r.phone ?? ""),
    phoneRaw: String(r.phone_raw ?? ""),
    status: String(r.status) as CampaignContactStatus,
    attempts: Number(r.attempts) || 0,
    providerMessageId: r.provider_message_id ? String(r.provider_message_id) : null,
    error: r.error ? String(r.error) : null,
    conversationId: r.conversation_id ? String(r.conversation_id) : null,
    lockedAt: r.locked_at ? new Date(String(r.locked_at)).toISOString() : null,
    sentAt: r.sent_at ? new Date(String(r.sent_at)).toISOString() : null,
    responseAt: r.response_at ? new Date(String(r.response_at)).toISOString() : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
  };
}

function mapEventRow(r: Record<string, unknown>): CampaignEvent {
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    campaignContactId: r.campaign_contact_id ? String(r.campaign_contact_id) : null,
    eventType: String(r.event_type) as CampaignEventType,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: new Date(String(r.created_at)).toISOString(),
  };
}

function mapSuppressionRow(r: Record<string, unknown>): CampaignSuppression {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    phone: String(r.phone),
    reason: String(r.reason ?? ""),
    source: String(r.source ?? "manual"),
    createdAt: new Date(String(r.created_at)).toISOString(),
  };
}

export interface NewContactInput {
  rawPayload: Record<string, unknown>;
  name: string;
  phone: string;
  phoneRaw: string;
  status: CampaignContactStatus;
  error?: string;
}

/** 5 minutos sin actividad = candidato a atascado (worker murió a mitad del tick). */
export const STALE_PROCESSING_MINUTES = 5;

class PostgresCampaignRepository {
  async createCampaign(companyId: string, name: string, description: string, createdBy: string): Promise<Campaign> {
    await ensureSchema();
    const sql = requireSql();
    const id = newId("camp");
    const rows = await withDbRetry(() =>
      sql<Record<string, unknown>[]>`
        INSERT INTO campaigns (id, company_id, name, description, status, created_by)
        VALUES (${id}, ${companyId}, ${name.trim()}, ${description}, 'BORRADOR', ${createdBy})
        RETURNING *
      `,
    );
    return mapCampaignRow(rows[0]!);
  }

  async getCampaign(companyId: string, id: string): Promise<Campaign | null> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<Record<string, unknown>[]>`
        SELECT * FROM campaigns WHERE company_id = ${companyId} AND id = ${id} LIMIT 1
      `,
    );
    return rows[0] ? mapCampaignRow(rows[0]) : null;
  }

  /** Sin scope de company_id — usado internamente por el worker (no expuesto por API sin chequeo). */
  async getCampaignById(id: string): Promise<Campaign | null> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() => sql<Record<string, unknown>[]>`SELECT * FROM campaigns WHERE id = ${id} LIMIT 1`);
    return rows[0] ? mapCampaignRow(rows[0]) : null;
  }

  async listCampaigns(companyId: string): Promise<Campaign[]> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<Record<string, unknown>[]>`
        SELECT * FROM campaigns WHERE company_id = ${companyId} ORDER BY created_at DESC
      `,
    );
    return rows.map(mapCampaignRow);
  }

  /** Usado en la recuperación tras reinicio del server — incluye current_job_id para no duplicar un tick que ya sigue vivo en Redis. */
  async listActiveCampaigns(): Promise<{ id: string; currentJobId: string | null }[]> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<{ id: string; current_job_id: string | null }[]>`
        SELECT id, current_job_id FROM campaigns WHERE status = 'EJECUTANDO'
      `,
    );
    return rows.map((r) => ({ id: r.id, currentJobId: r.current_job_id }));
  }

  async updateMessageTemplate(companyId: string, id: string, messageTemplate: string): Promise<void> {
    await ensureSchema();
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE campaigns SET message_template = ${messageTemplate}, updated_at = now()
        WHERE company_id = ${companyId} AND id = ${id}
      `,
    );
  }

  async updateSettings(companyId: string, id: string, settings: CampaignSettingsInput): Promise<void> {
    await ensureSchema();
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE campaigns SET
          interval_seconds = ${settings.intervalSeconds},
          concurrency = ${settings.concurrency},
          max_retries = ${settings.maxRetries},
          updated_at = now()
        WHERE company_id = ${companyId} AND id = ${id}
      `,
    );
  }

  async replaceContacts(companyId: string, campaignId: string, contacts: NewContactInput[]): Promise<void> {
    await ensureSchema();
    const sql = requireSql();
    await withDbRetry(() =>
      sql.begin(async (tx) => {
        await tx`DELETE FROM campaign_contacts WHERE campaign_id = ${campaignId}`;
        for (const c of contacts) {
          await tx`
            INSERT INTO campaign_contacts (
              id, campaign_id, company_id, raw_payload, name, phone, phone_raw, status, error
            ) VALUES (
              ${newId("cc")}, ${campaignId}, ${companyId}, ${tx.json(c.rawPayload as import("postgres").JSONValue)},
              ${c.name}, ${c.phone}, ${c.phoneRaw}, ${c.status}, ${c.error ?? null}
            )
            ON CONFLICT (campaign_id, phone) WHERE phone <> '' DO NOTHING
          `;
        }
      }),
    );
    await this.recalculateCounts(campaignId);
  }

  async recalculateCounts(campaignId: string): Promise<void> {
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<{ status: string; n: number }[]>`
        SELECT status, count(*)::int AS n FROM campaign_contacts
        WHERE campaign_id = ${campaignId}
        GROUP BY status
      `,
    );
    const byStatus = new Map(rows.map((r) => [r.status, r.n]));
    const total = rows.reduce((sum, r) => sum + r.n, 0);
    const eligible = byStatus.get("PENDING") ?? 0;
    const excluded =
      (byStatus.get("EXCLUDED") ?? 0) +
      (byStatus.get("INVALID") ?? 0) +
      (byStatus.get("DUPLICATE") ?? 0) +
      (byStatus.get("OPTED_OUT") ?? 0);
    await withDbRetry(() =>
      sql`
        UPDATE campaigns SET
          total_contacts = ${total}, eligible_contacts = ${eligible}, excluded_count = ${excluded}, updated_at = now()
        WHERE id = ${campaignId}
      `,
    );
  }

  /** Conteo en vivo por estado — la fuente de verdad para el dashboard (los contadores de `campaigns` solo suman, nunca restan). */
  async countContactsByStatus(campaignId: string): Promise<Record<string, number>> {
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<{ status: string; n: number }[]>`
        SELECT status, count(*)::int AS n FROM campaign_contacts
        WHERE campaign_id = ${campaignId}
        GROUP BY status
      `,
    );
    return Object.fromEntries(rows.map((r) => [r.status, r.n]));
  }

  async listContacts(campaignId: string): Promise<CampaignContact[]> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<Record<string, unknown>[]>`
        SELECT * FROM campaign_contacts WHERE campaign_id = ${campaignId} ORDER BY created_at ASC
      `,
    );
    return rows.map(mapContactRow);
  }

  /**
   * CAS atómico: transiciona a EJECUTANDO solo si el estado actual sigue
   * siendo uno de los permitidos. Si dos llamadas a start()/resume() llegan
   * casi simultáneas (doble clic, reintento de red), la condición WHERE
   * hace que como mucho UNA afecte una fila — la otra no encuentra nada que
   * actualizar y no debe encolar un segundo tick.
   */
  async tryTransitionToRunning(id: string, fromStatuses: CampaignStatus[]): Promise<Campaign | null> {
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<Record<string, unknown>[]>`
        UPDATE campaigns SET status = 'EJECUTANDO', updated_at = now()
        WHERE id = ${id} AND status = ANY(${fromStatuses})
        RETURNING *
      `,
    );
    return rows[0] ? mapCampaignRow(rows[0]) : null;
  }

  /**
   * CAS atómico: confirma que este tick (jobId) sigue siendo el único
   * autorizado a actuar para esta campaña — `current_job_id` sigue
   * apuntando exactamente a él. Toda transición que saca a la campaña de
   * EJECUTANDO (pausar, cancelar, auto-pausa, completar) también limpia
   * `current_job_id`, así que si esta confirmación pasa, la campaña sigue
   * en EJECUTANDO por construcción. Si dos ticks llegaran a coexistir por
   * cualquier motivo, como mucho UNO pasa esto — garantiza que nunca hay
   * más de un contacto de la misma campaña en PROCESSING a la vez.
   */
  async confirmTickOwnership(id: string, jobId: string): Promise<boolean> {
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<{ id: string }[]>`
        UPDATE campaigns SET updated_at = now()
        WHERE id = ${id} AND current_job_id = ${jobId}
        RETURNING id
      `,
    );
    return rows.length > 0;
  }

  async setStatus(
    id: string,
    status: CampaignStatus,
    extra?: { riskReason?: string | null; currentJobId?: string | null },
  ): Promise<void> {
    const sql = requireSql();
    const timestampField =
      status === "EJECUTANDO" ? "started_at" : status === "PAUSADA" ? "paused_at" : null;
    const finished = status === "COMPLETADA" || status === "CANCELADA" || status === "ERROR";

    await withDbRetry(() =>
      sql`
        UPDATE campaigns SET
          status = ${status},
          risk_status = ${status === "AUTO_PAUSADA" ? "auto_paused" : "ok"},
          risk_reason = ${extra?.riskReason ?? null},
          current_job_id = ${extra?.currentJobId === undefined ? sql`current_job_id` : extra.currentJobId},
          started_at = ${timestampField === "started_at" ? sql`COALESCE(started_at, now())` : sql`started_at`},
          paused_at = ${timestampField === "paused_at" ? sql`now()` : sql`paused_at`},
          finished_at = ${finished ? sql`now()` : sql`finished_at`},
          updated_at = now()
        WHERE id = ${id}
      `,
    );
  }

  async setCurrentJobId(id: string, jobId: string | null): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() => sql`UPDATE campaigns SET current_job_id = ${jobId} WHERE id = ${id}`);
  }

  /**
   * Reclamo atómico del siguiente contacto PENDING. CTE + FOR UPDATE SKIP LOCKED:
   * si dos ticks corren en paralelo, cada uno bloquea y se queda con una fila
   * distinta sin esperar al otro ni poder reclamar la misma — patrón estándar
   * de Postgres para colas de trabajo concurrentes. `UPDATE ... ORDER BY ...
   * LIMIT ...` no es válido en Postgres, por eso el SELECT+lock va en el CTE.
   */
  async claimNextPendingContact(campaignId: string): Promise<CampaignContact | null> {
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql.begin(async (tx) => {
        return tx<Record<string, unknown>[]>`
          WITH claimed AS (
            SELECT id FROM campaign_contacts
            WHERE campaign_id = ${campaignId} AND status = 'PENDING'
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE campaign_contacts
          SET status = 'PROCESSING', locked_at = now(), updated_at = now()
          WHERE id = (SELECT id FROM claimed)
          RETURNING *
        `;
      }),
    );
    return rows[0] ? mapContactRow(rows[0]) : null;
  }

  async markContactSent(id: string, providerMessageId: string, conversationId: string): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE campaign_contacts SET
          status = 'SENT', sent_at = now(), provider_message_id = ${providerMessageId},
          conversation_id = ${conversationId}, error = null, updated_at = now()
        WHERE id = ${id}
      `,
    );
    await withDbRetry(() =>
      sql`
        UPDATE campaigns SET sent_count = sent_count + 1, consecutive_failures = 0
        WHERE id = (SELECT campaign_id FROM campaign_contacts WHERE id = ${id})
      `,
    );
  }

  async markContactFailed(id: string, error: string): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE campaign_contacts SET
          status = 'FAILED', attempts = attempts + 1, error = ${error}, updated_at = now()
        WHERE id = ${id}
      `,
    );
    await withDbRetry(() =>
      sql`
        UPDATE campaigns SET failed_count = failed_count + 1, consecutive_failures = consecutive_failures + 1
        WHERE id = (SELECT campaign_id FROM campaign_contacts WHERE id = ${id})
      `,
    );
  }

  /** Re-chequeo de suppression list justo antes de enviar (no solo en el import). */
  async excludeContactAtSendTime(id: string): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE campaign_contacts SET status = 'OPTED_OUT', updated_at = now()
        WHERE id = ${id}
      `,
    );
    await withDbRetry(() =>
      sql`
        UPDATE campaigns SET excluded_count = excluded_count + 1, opt_out_count = opt_out_count + 1
        WHERE id = (SELECT campaign_id FROM campaign_contacts WHERE id = ${id})
      `,
    );
  }

  async markContactResponse(id: string): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() => sql`UPDATE campaign_contacts SET response_at = now(), updated_at = now() WHERE id = ${id}`);
    await withDbRetry(() => sql`UPDATE campaigns SET response_count = response_count + 1 WHERE id = (SELECT campaign_id FROM campaign_contacts WHERE id = ${id})`);
  }

  async getContact(id: string): Promise<CampaignContact | null> {
    const sql = requireSql();
    const rows = await withDbRetry(() => sql<Record<string, unknown>[]>`SELECT * FROM campaign_contacts WHERE id = ${id} LIMIT 1`);
    return rows[0] ? mapContactRow(rows[0]) : null;
  }

  /** Cualquier conversación con campaign_id apuntando a esta campaña, aún sin respuesta registrada. */
  async findContactByConversationId(campaignId: string, conversationId: string): Promise<CampaignContact | null> {
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<Record<string, unknown>[]>`
        SELECT * FROM campaign_contacts
        WHERE campaign_id = ${campaignId} AND conversation_id = ${conversationId}
        LIMIT 1
      `,
    );
    return rows[0] ? mapContactRow(rows[0]) : null;
  }

  async cancelPendingContacts(campaignId: string): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE campaign_contacts SET status = 'CANCELLED', updated_at = now()
        WHERE campaign_id = ${campaignId} AND status = 'PENDING'
      `,
    );
  }

  async hasPendingContacts(campaignId: string): Promise<boolean> {
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<{ n: number }[]>`
        SELECT count(*)::int AS n FROM campaign_contacts
        WHERE campaign_id = ${campaignId} AND status = 'PENDING'
        LIMIT 1
      `,
    );
    return (rows[0]?.n ?? 0) > 0;
  }

  /** PROCESSING con locked_at más viejo que el umbral — el worker murió a mitad del tick. */
  async listStaleProcessingContacts(campaignId: string, staleMinutes = STALE_PROCESSING_MINUTES): Promise<CampaignContact[]> {
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<Record<string, unknown>[]>`
        SELECT * FROM campaign_contacts
        WHERE campaign_id = ${campaignId} AND status = 'PROCESSING'
          AND locked_at < now() - (${staleMinutes} || ' minutes')::interval
        ORDER BY locked_at ASC
      `,
    );
    return rows.map(mapContactRow);
  }

  /** Acción explícita del admin — nunca automática, para no reenviar en silencio. */
  async requeueStaleContact(id: string): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE campaign_contacts SET status = 'PENDING', locked_at = null, updated_at = now()
        WHERE id = ${id} AND status = 'PROCESSING'
      `,
    );
  }

  async markStaleContactFailed(id: string): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE campaign_contacts SET
          status = 'FAILED', error = 'Marcado como fallido tras quedar atascado (worker interrumpido).', updated_at = now()
        WHERE id = ${id} AND status = 'PROCESSING'
      `,
    );
    await withDbRetry(() => sql`UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = (SELECT campaign_id FROM campaign_contacts WHERE id = ${id})`);
  }

  async logEvent(
    campaignId: string,
    eventType: CampaignEventType,
    metadata: Record<string, unknown> = {},
    campaignContactId?: string,
  ): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        INSERT INTO campaign_events (id, campaign_id, campaign_contact_id, event_type, metadata)
        VALUES (${newId("cev")}, ${campaignId}, ${campaignContactId ?? null}, ${eventType}, ${sql.json(metadata as import("postgres").JSONValue)})
      `,
    );
  }

  async listEvents(campaignId: string, limit = 100): Promise<CampaignEvent[]> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<Record<string, unknown>[]>`
        SELECT * FROM campaign_events WHERE campaign_id = ${campaignId}
        ORDER BY created_at DESC LIMIT ${limit}
      `,
    );
    return rows.map(mapEventRow);
  }

  async isPhoneSuppressed(companyId: string, phone: string): Promise<boolean> {
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<{ n: number }[]>`
        SELECT 1 AS n FROM campaign_suppressions WHERE company_id = ${companyId} AND phone = ${phone} LIMIT 1
      `,
    );
    return rows.length > 0;
  }

  async addSuppression(companyId: string, phone: string, reason: string, source: string): Promise<void> {
    await ensureSchema();
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        INSERT INTO campaign_suppressions (id, company_id, phone, reason, source)
        VALUES (${newId("sup")}, ${companyId}, ${phone}, ${reason}, ${source})
        ON CONFLICT (company_id, phone) DO NOTHING
      `,
    );
  }

  async listSuppressions(companyId: string): Promise<CampaignSuppression[]> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<Record<string, unknown>[]>`
        SELECT * FROM campaign_suppressions WHERE company_id = ${companyId} ORDER BY created_at DESC
      `,
    );
    return rows.map(mapSuppressionRow);
  }

  async incrementOptOutCount(campaignId: string): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() => sql`UPDATE campaigns SET opt_out_count = opt_out_count + 1 WHERE id = ${campaignId}`);
  }
}

let repo: PostgresCampaignRepository | null = null;
export function getCampaignRepository(): PostgresCampaignRepository {
  if (!repo) repo = new PostgresCampaignRepository();
  return repo;
}
