import "server-only";
import type {
  AdminAdvisor,
  AdminConversation,
  AdminLeadDetail,
  AdminLeadStatus,
  AssignAdvisorInput,
  ClientProfile,
  LeadNote,
  LeadTimelineEvent,
  UpsertLeadNoteInput,
} from "@/types/admin-lead";
import type { ChatMessage } from "@/types/conversation";
import { getDefaultClientProfile, getMockMessages } from "@/data/mock/admin-leads.mock";
import { getAuthRepository } from "@/repositories/auth.repository";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { formatChatTime } from "@/lib/format";
import { resolveConversationChannel } from "@/lib/conversation-channel";
import { isWebQrConversation } from "@/lib/web-qr/conversation-id";
import { formatWhatsAppDisplayPhone, isLikelyWhatsAppLid } from "@/lib/whatsapp/phone";
import { ADVISOR_ONLINE_WINDOW_MINUTES } from "@/lib/advisor-presence";
import { withLatency } from "@/lib/mock";
import { mapConversationTipification } from "@/lib/conversation-tipification";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import { getConfig, setConfig } from "@/server/db/app-config";
import { ensureSchema, ensureSchemaForRead, getSql, hasDatabase, withDbRetry, withQueryTimeout } from "@/server/db/client";

export interface AutoAssignSettings {
  enabled: boolean;
  lastAdvisorIndex: number;
}

export const AUTO_ASSIGN_KEY = "leads_auto_assign";

export interface AdminLeadsRepository {
  listConversations(): Promise<AdminConversation[]>;
  listConversationsForAdvisor(advisorId: string): Promise<AdminConversation[]>;
  getDetail(conversationId: string): Promise<AdminLeadDetail>;
  listAdvisors(): Promise<AdminAdvisor[]>;
  assignAdvisor(input: AssignAdvisorInput): Promise<AdminConversation>;
  getMessages(conversationId: string): Promise<ChatMessage[]>;
  listNotes(conversationId: string): Promise<LeadNote[]>;
  addNote(input: UpsertLeadNoteInput): Promise<LeadNote>;
  updateNote(id: string, text: string): Promise<LeadNote>;
  deleteNote(id: string): Promise<void>;
  /** Borra una conversación con todo su historial (mensajes y notas). */
  deleteConversation(conversationId: string): Promise<void>;
  /** Borra TODAS las conversaciones y su historial. Irreversible. */
  deleteAllConversations(): Promise<number>;
  getAutoAssignSettings(): Promise<AutoAssignSettings>;
  setAutoAssignEnabled(enabled: boolean): Promise<AutoAssignSettings>;
  autoAssignIfNeeded(conversationId: string): Promise<void>;
  autoAssignAllPending(options?: { skipThrottle?: boolean }): Promise<void>;
  /** Asigna solo si hay chats sin asesora (consulta barata, evita saturar el pool). */
  ensurePendingAssigned(): Promise<void>;
}

type ConvRow = {
  id: string;
  phone: string;
  customer_name: string;
  rut?: string | null;
  last_message: string;
  last_message_at: string;
  last_message_direction?: string;
  unread: number;
  online: boolean;
  assigned_advisor_id: string | null;
  assigned_advisor_name: string | null;
  admin_status: string;
  carrier?: string | null;
  source?: string | null;
  latest_tipification_slug?: string | null;
  latest_tipification_name?: string | null;
  badge_bg?: string | null;
  badge_text?: string | null;
};

function toAdminStatus(value: string): AdminLeadStatus {
  const allowed: AdminLeadStatus[] = [
    "nuevo",
    "asignado",
    "contactado",
    "negociacion",
    "convertido",
    "perdido",
  ];
  return allowed.includes(value as AdminLeadStatus) ? (value as AdminLeadStatus) : "nuevo";
}

function mapConversation(r: ConvRow): AdminConversation {
  const formattedPhone = formatWhatsAppDisplayPhone(r.phone);
  const displayName =
    r.customer_name?.trim() ||
    formattedPhone ||
    (isWebQrConversation(r.id) && isLikelyWhatsAppLid(r.phone) ? "Contacto WhatsApp" : r.phone);

  return {
    id: r.id,
    customerName: displayName,
    phone: formattedPhone || r.phone,
    rut: r.rut ?? "",
    channel: resolveConversationChannel(r.id),
    isManualOrigin: r.source === "manual_advisor",
    lastMessage: r.last_message,
    lastMessageTime: formatChatTime(r.last_message_at),
    lastMessageDirection: r.last_message_direction === "out" ? "out" : "in",
    unread: Number(r.unread) || 0,
    status: toAdminStatus(r.admin_status),
    online: Boolean(r.online),
    assignedAdvisor: r.assigned_advisor_id
      ? {
          id: r.assigned_advisor_id,
          name: r.assigned_advisor_name ?? "",
        }
      : null,
    latestTipification: mapConversationTipification(r),
    carrier: r.carrier ?? "wom",
  };
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

class PostgresAdminLeadsRepository implements AdminLeadsRepository {
  private async fetchRows(advisorId?: string, activeOnly?: boolean): Promise<ConvRow[]> {
    await ensureSchemaForRead();
    const sql = requireSql();
    return withQueryTimeout(
      withDbRetry(() =>
        advisorId
          ? sql<ConvRow[]>`
              SELECT
                c.id, c.phone, c.customer_name, c.rut, c.last_message, c.last_message_at, c.last_message_direction,
                c.unread, c.online, c.assigned_advisor_id, c.assigned_advisor_name, c.admin_status, c.carrier, c.source,
                COALESCE(NULLIF(c.current_tipification_slug, ''), lg.gestion_type) AS latest_tipification_slug,
                t.name AS latest_tipification_name,
                t.badge_bg,
                t.badge_text
              FROM lead_conversations c
              LEFT JOIN LATERAL (
                SELECT gestion_type
                FROM lead_gestiones
                WHERE conversation_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
              ) lg ON true
              LEFT JOIN tipifications t
                ON t.slug = COALESCE(NULLIF(c.current_tipification_slug, ''), lg.gestion_type) AND t.company_id = ${DEFAULT_COMPANY_ID}
              WHERE c.assigned_advisor_id = ${advisorId}
                AND (${activeOnly ?? false}::boolean IS FALSE OR c.inbox_state = 'active')
              ORDER BY c.last_message_at DESC
            `
          : sql<ConvRow[]>`
              SELECT
                c.id, c.phone, c.customer_name, c.rut, c.last_message, c.last_message_at, c.last_message_direction,
                c.unread, c.online, c.assigned_advisor_id, c.assigned_advisor_name, c.admin_status, c.carrier, c.source,
                COALESCE(NULLIF(c.current_tipification_slug, ''), lg.gestion_type) AS latest_tipification_slug,
                t.name AS latest_tipification_name,
                t.badge_bg,
                t.badge_text
              FROM lead_conversations c
              LEFT JOIN LATERAL (
                SELECT gestion_type
                FROM lead_gestiones
                WHERE conversation_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
              ) lg ON true
              LEFT JOIN tipifications t
                ON t.slug = COALESCE(NULLIF(c.current_tipification_slug, ''), lg.gestion_type) AND t.company_id = ${DEFAULT_COMPANY_ID}
              WHERE (${activeOnly ?? false}::boolean IS FALSE OR c.inbox_state = 'active')
              ORDER BY c.last_message_at DESC
            `,
      ),
      8000,
    ) as Promise<ConvRow[]>;
  }

  async listConversations() {
    // El barrido de auto-asignación NO se dispara aquí: lo programan las rutas
    // con `after()` de Next. Lanzarlo sin esperar (void) dentro de una función
    // serverless puede cortarse al responder y dejar la conexión del pool en
    // mal estado, provocando fallos intermitentes en el listado.
    //
    // activeOnly=true: una vez "Guardar y cerrar" cierra la conversación
    // (inbox_state='closed'), debe salir de la bandeja de trabajo — igual
    // que ya pasa en la bandeja de asesora. Antes esta lista mostraba TODO
    // para siempre, así que un chat cerrado se quedaba visible ahí sin
    // ninguna diferencia salvo la etiqueta de estado.
    const rows = await this.fetchRows(undefined, true);
    return rows.map(mapConversation);
  }

  async listConversationsForAdvisor(advisorId: string) {
    const rows = await this.fetchRows(advisorId, true);
    return rows.map(mapConversation);
  }

  async listAdvisors() {
    const users = await getAuthRepository().listUsers();
    return users
      .filter((u) => u.active && (u.role === "asesora" || u.role === "supervisor"))
      .map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl || undefined }));
  }

  async getMessages(conversationId: string) {
    return getConversationRepository().getMessages(conversationId);
  }

  async assignAdvisor(input: AssignAdvisorInput) {
    await ensureSchema();
    const sql = requireSql();
    const advisor = await getAuthRepository().findById(input.advisorId);
    if (!advisor) throw new Error("Asesora no encontrada");

    // La asignación manual es una decisión explícita del admin — a
    // diferencia de la auto-asignación equitativa, no se bloquea por el estado de
    // presencia (baño/almuerzo/desconectado). El admin puede tener razones
    // válidas para asignarle un chat a alguien aunque no esté "disponible"
    // en este momento.
    //
    // inbox_state = 'active' + reopened_at: asignar SIEMPRE debe significar
    // que le aparece en su bandeja — si no, "reasignar" un chat que la
    // asesora ya tipificó y cerró ("Guardar y cerrar" pone inbox_state =
    // 'closed') cambiaba el dueño en la base pero la conversación seguía sin
    // aparecerle a nadie. Mismos campos que reopenConversationToAdvisor()
    // usa para el reabrir por inbound — asignar es, en el fondo, lo mismo.
    await sql`
      UPDATE lead_conversations SET
        assigned_advisor_id = ${advisor.id},
        assigned_advisor_name = ${advisor.name},
        assigned_advisor_at = now(),
        admin_status = 'asignado',
        inbox_state = 'active',
        reopened_at = now()
      WHERE id = ${input.conversationId}
    `;

    const rows = await this.fetchRows();
    const conv = rows.find((r) => r.id === input.conversationId);
    if (!conv) throw new Error("Conversación no encontrada");
    const { emitLeadsConversationUpdated } = await import("@/server/realtime/emit");
    emitLeadsConversationUpdated({
      conversationId: input.conversationId,
      assignedAdvisorId: advisor.id,
      reason: "assign",
    });
    return mapConversation(conv);
  }

  private async fetchRowById(conversationId: string): Promise<ConvRow | null> {
    await ensureSchemaForRead();
    const sql = requireSql();
    const rows = (await withQueryTimeout(
      withDbRetry(() =>
        sql<ConvRow[]>`
          SELECT
            c.id, c.phone, c.customer_name, c.rut, c.last_message, c.last_message_at, c.last_message_direction,
            c.unread, c.online, c.assigned_advisor_id, c.assigned_advisor_name, c.admin_status, c.carrier, c.source,
            COALESCE(NULLIF(c.current_tipification_slug, ''), lg.gestion_type) AS latest_tipification_slug,
            t.name AS latest_tipification_name,
            t.badge_bg,
            t.badge_text
          FROM lead_conversations c
          LEFT JOIN LATERAL (
            SELECT gestion_type
            FROM lead_gestiones
            WHERE conversation_id = c.id
            ORDER BY created_at DESC
            LIMIT 1
          ) lg ON true
          LEFT JOIN tipifications t
            ON t.slug = COALESCE(NULLIF(c.current_tipification_slug, ''), lg.gestion_type) AND t.company_id = ${DEFAULT_COMPANY_ID}
          WHERE c.id = ${conversationId}
          LIMIT 1
        `,
      ),
      8000,
    )) as ConvRow[];
    return rows[0] ?? null;
  }

  async getDetail(conversationId: string): Promise<AdminLeadDetail> {
    const row = await this.fetchRowById(conversationId);
    if (!row) throw new Error("Conversación no encontrada");
    const conversation = mapConversation(row);
    const [messages, notes] = await Promise.all([
      this.getMessages(conversationId),
      this.listNotes(conversationId),
    ]);
    const timeline: LeadTimelineEvent[] = [
      ...notes.map((n) => ({
        id: n.id,
        conversationId,
        type: "note" as const,
        title: "Nota",
        detail: n.text,
        at: n.createdAt,
        user: n.author,
      })),
      ...messages.slice(-5).map((m) => ({
        id: m.id,
        conversationId,
        type: "message" as const,
        title: m.direction === "in" ? "Mensaje recibido" : "Mensaje enviado",
        detail: m.text,
        at: m.time,
      })),
    ];
    return {
      conversation,
      messages,
      notes,
      timeline,
      client: getDefaultClientProfile(conversationId),
    };
  }

  async listNotes(conversationId: string) {
    await ensureSchema();
    const sql = requireSql();
    const rows = await sql`
      SELECT id, conversation_id, text, author, created_at
      FROM lead_notes
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC
    `;
    return rows.map((r) => ({
      id: (r as { id: string }).id,
      conversationId: (r as { conversation_id: string }).conversation_id,
      text: (r as { text: string }).text,
      author: (r as { author: string }).author,
      createdAt: new Date((r as { created_at: string }).created_at).toISOString(),
    }));
  }

  async addNote(input: UpsertLeadNoteInput) {
    await ensureSchema();
    const sql = requireSql();
    const id = `n-${Date.now()}`;
    const createdAt = new Date().toISOString();
    await sql`
      INSERT INTO lead_notes (id, conversation_id, text, author, created_at)
      VALUES (${id}, ${input.conversationId}, ${input.text}, ${input.author}, ${createdAt})
    `;
    return { id, conversationId: input.conversationId, text: input.text, author: input.author, createdAt };
  }

  async updateNote(id: string, text: string) {
    await ensureSchema();
    const sql = requireSql();
    await sql`UPDATE lead_notes SET text = ${text} WHERE id = ${id}`;
    const rows = await sql`SELECT * FROM lead_notes WHERE id = ${id} LIMIT 1`;
    const r = rows[0] as { id: string; conversation_id: string; text: string; author: string; created_at: string } | undefined;
    if (!r) throw new Error("Nota no encontrada");
    return {
      id: r.id,
      conversationId: r.conversation_id,
      text: r.text,
      author: r.author,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  async deleteNote(id: string) {
    await ensureSchema();
    const sql = requireSql();
    await sql`DELETE FROM lead_notes WHERE id = ${id}`;
  }

  /**
   * Borra una conversación y todo su historial en una transacción: si algo
   * falla, no queda a medias (mensajes huérfanos o al revés).
   * No toca ventas ni gestiones comerciales.
   */
  async deleteConversation(conversationId: string) {
    await ensureSchema();
    const sql = requireSql();
    await sql.begin(async (tx) => {
      await tx`DELETE FROM lead_messages WHERE conversation_id = ${conversationId}`;
      await tx`DELETE FROM lead_notes WHERE conversation_id = ${conversationId}`;
      await tx`DELETE FROM lead_conversations WHERE id = ${conversationId}`;
    });
  }

  /** Borra TODAS las conversaciones y su historial. Devuelve cuántas borró. */
  async deleteAllConversations(): Promise<number> {
    await ensureSchema();
    const sql = requireSql();
    let deleted = 0;
    await sql.begin(async (tx) => {
      const rows = (await tx`
        SELECT count(*)::int AS n FROM lead_conversations
      `) as unknown as { n: number }[];
      deleted = rows[0]?.n ?? 0;
      await tx`DELETE FROM lead_messages`;
      await tx`DELETE FROM lead_notes`;
      await tx`DELETE FROM lead_conversations`;
    });
    return deleted;
  }

  async getAutoAssignSettings() {
    const stored = await getConfig<AutoAssignSettings | null>(AUTO_ASSIGN_KEY, null);
    if (stored === null) {
      const initial = { enabled: true, lastAdvisorIndex: 0 };
      try {
        await setConfig(AUTO_ASSIGN_KEY, initial);
      } catch {
        /* ignore seed errors */
      }
      return initial;
    }
    return stored;
  }

  async setAutoAssignEnabled(enabled: boolean) {
    const current = await this.getAutoAssignSettings();
    const next = { ...current, enabled };
    await setConfig(AUTO_ASSIGN_KEY, next);
    return next;
  }

  /**
   * Asigna conversaciones nuevas a turno entre las asesoras del pool
   * (mitad y mitad si hay dos). No usa el tamaño de la bandeja: si Carolina
   * ya tiene 200 chats viejos y Mónica 100, los nuevos siguen alternando.
   *
   * El turno es quien recibió una asignación hace más tiempo
   * (`assigned_advisor_at`). Solo entra quien esté `disponible`.
   * `onlyOnline=true` limita además a last_seen en los últimos 10 min.
   */
  private async assignPendingRoundRobin(
    conversationId: string | null,
    onlyOnline: boolean,
  ): Promise<number> {
    const sql = requireSql();
    const rows = await withQueryTimeout(
      sql.begin(async (tx) => {
        const advisors = await tx<{ id: string; name: string; last_assign: Date | null }[]>`
          SELECT u.id, u.name,
                 (
                   SELECT max(c.assigned_advisor_at)
                   FROM lead_conversations c
                   WHERE c.assigned_advisor_id = u.id
                 ) AS last_assign
          FROM users u
          WHERE u.role = 'asesora' AND u.active = true
            AND u.presence_status = 'disponible'
            AND (
              ${onlyOnline}::boolean IS FALSE
              OR (
                u.last_seen_at IS NOT NULL
                AND u.last_seen_at > now() - make_interval(mins => ${ADVISOR_ONLINE_WINDOW_MINUTES})
              )
            )
          FOR UPDATE OF u
        `;
        if (advisors.length === 0) return [] as { id: string; assigned_advisor_id: string | null }[];

        const pending = conversationId
          ? await tx<{ id: string }[]>`
              SELECT id FROM lead_conversations
              WHERE assigned_advisor_id IS NULL AND id = ${conversationId}
              ORDER BY last_message_at
              FOR UPDATE
            `
          : await tx<{ id: string }[]>`
              SELECT id FROM lead_conversations
              WHERE assigned_advisor_id IS NULL
              ORDER BY last_message_at
              LIMIT 200
              FOR UPDATE SKIP LOCKED
            `;
        if (pending.length === 0) return [] as { id: string; assigned_advisor_id: string | null }[];

        const roster = advisors.map((a) => ({
          id: a.id,
          name: a.name,
          lastAssign: a.last_assign ? new Date(a.last_assign).getTime() : 0,
        }));
        const convIds: string[] = [];
        const advisorIds: string[] = [];
        const advisorNames: string[] = [];
        let seq = 0;
        for (const conv of pending) {
          roster.sort((a, b) => a.lastAssign - b.lastAssign || a.name.localeCompare(b.name, "es"));
          const pick = roster[0]!;
          convIds.push(conv.id);
          advisorIds.push(pick.id);
          advisorNames.push(pick.name);
          pick.lastAssign = Date.now() + seq;
          seq += 1;
        }

        return tx<{ id: string; assigned_advisor_id: string | null }[]>`
          UPDATE lead_conversations c
          SET assigned_advisor_id = v.advisor_id,
              assigned_advisor_name = v.advisor_name,
              assigned_advisor_at = now(),
              admin_status = 'asignado'
          FROM (
            SELECT *
            FROM unnest(
              ${tx.array(convIds)}::text[],
              ${tx.array(advisorIds)}::text[],
              ${tx.array(advisorNames)}::text[]
            ) AS t(id, advisor_id, advisor_name)
          ) v
          WHERE c.id = v.id
            AND c.assigned_advisor_id IS NULL
          RETURNING c.id, c.assigned_advisor_id
        `;
      }),
      8000,
    );
    if (rows.length > 0) {
      const { emitLeadsConversationUpdated } = await import("@/server/realtime/emit");
      for (const row of rows) {
        const r = row as { id: string; assigned_advisor_id: string | null };
        emitLeadsConversationUpdated({
          conversationId: r.id,
          assignedAdvisorId: r.assigned_advisor_id,
          reason: "auto-assign",
        });
      }
    }
    return rows.length;
  }

  /**
   * Auto-asignación con fallback inteligente:
   * - Primero: conectadas y disponibles.
   * - Si hay conectadas pero ninguna disponible (baño/almuerzo/desconectado): pendiente.
   * - Si nadie conectado: reparte entre todas las activas disponibles (offline).
   */
  private async autoAssignWithFallback(conversationId: string | null): Promise<number> {
    const assignedOnline = await this.assignPendingRoundRobin(conversationId, true);
    if (assignedOnline > 0) return assignedOnline;

    const sql = requireSql();
    const counts = await withQueryTimeout(
      sql<{ online_any: number; online_disponible: number }[]>`
        SELECT
          count(*) FILTER (
            WHERE last_seen_at IS NOT NULL
              AND last_seen_at > now() - make_interval(mins => ${ADVISOR_ONLINE_WINDOW_MINUTES})
          )::int AS online_any,
          count(*) FILTER (
            WHERE presence_status = 'disponible'
              AND last_seen_at IS NOT NULL
              AND last_seen_at > now() - make_interval(mins => ${ADVISOR_ONLINE_WINDOW_MINUTES})
          )::int AS online_disponible
        FROM users
        WHERE role = 'asesora' AND active = true
      `,
      3000,
    );
    const onlineAny = counts[0]?.online_any ?? 0;
    const onlineDisponible = counts[0]?.online_disponible ?? 0;

    if (onlineAny > 0 && onlineDisponible === 0) {
      return 0;
    }

    return this.assignPendingRoundRobin(conversationId, false);
  }

  /** Asigna una conversación concreta (la llama el webhook al entrar un mensaje). */
  async autoAssignIfNeeded(conversationId: string) {
    const settings = await this.getAutoAssignSettings();
    if (!settings.enabled) return;
    await ensureSchema();
    await this.autoAssignWithFallback(conversationId);
  }

  /**
   * Barrido de pendientes. Se limita con un throttle porque antes se ejecutaba
   * en CADA poll de la bandeja (cada 5 s por asesora) y saturaba la base.
   */
  async autoAssignAllPending(options?: { skipThrottle?: boolean }) {
    if (!options?.skipThrottle && Date.now() - lastSweepAt < SWEEP_INTERVAL_MS) return;
    lastSweepAt = Date.now();

    const settings = await this.getAutoAssignSettings();
    if (!settings.enabled) return;
    await ensureSchema();
    await this.autoAssignWithFallback(null);
  }

  async ensurePendingAssigned() {
    const settings = await this.getAutoAssignSettings();
    if (!settings.enabled) return;
    await ensureSchema();
    const sql = requireSql();
    const pending = await withQueryTimeout(
      sql<{ n: number }[]>`
        SELECT 1 AS n FROM lead_conversations
        WHERE assigned_advisor_id IS NULL
        LIMIT 1
      `,
      3000,
    );
    if (pending.length === 0) return;
    await this.autoAssignAllPending({ skipThrottle: true });
  }
}

/** Throttle del barrido de auto-asignación (por instancia serverless). */
let lastSweepAt = 0;
const SWEEP_INTERVAL_MS = 30_000;

class MockAdminLeadsRepository implements AdminLeadsRepository {
  private conversations: AdminConversation[] = [];
  private notes: LeadNote[] = [];
  private autoAssign: AutoAssignSettings = { enabled: false, lastAdvisorIndex: 0 };

  listConversations() {
    return withLatency([...this.conversations]);
  }

  listConversationsForAdvisor(advisorId: string) {
    return withLatency(this.conversations.filter((c) => c.assignedAdvisor?.id === advisorId));
  }

  listAdvisors() {
    return getAuthRepository()
      .listUsers()
      .then((users) =>
        users
          .filter((u) => u.active && (u.role === "asesora" || u.role === "supervisor"))
          .map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl || undefined })),
      );
  }

  getMessages(conversationId: string) {
    return withLatency(getMockMessages(conversationId));
  }

  async assignAdvisor(input: AssignAdvisorInput) {
    const advisor = (await getAuthRepository().listUsers()).find((a) => a.id === input.advisorId);
    if (!advisor) throw new Error("Asesora no encontrada");
    const idx = this.conversations.findIndex((c) => c.id === input.conversationId);
    if (idx === -1) throw new Error("Conversación no encontrada");
    this.conversations[idx] = {
      ...this.conversations[idx],
      assignedAdvisor: { id: advisor.id, name: advisor.name, avatarUrl: advisor.avatarUrl || undefined },
      status: "asignado",
    };
    return withLatency(this.conversations[idx]);
  }

  async getDetail(conversationId: string) {
    const conversation = this.conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Conversación no encontrada");
    return withLatency({
      conversation,
      messages: getMockMessages(conversationId),
      notes: this.notes.filter((n) => n.conversationId === conversationId),
      timeline: [],
      client: getDefaultClientProfile(conversationId),
    });
  }

  listNotes(conversationId: string) {
    return withLatency(this.notes.filter((n) => n.conversationId === conversationId));
  }

  addNote(input: UpsertLeadNoteInput) {
    const note: LeadNote = {
      id: `n-${Date.now()}`,
      conversationId: input.conversationId,
      text: input.text,
      createdAt: new Date().toISOString(),
      author: input.author,
    };
    this.notes.unshift(note);
    return withLatency(note);
  }

  updateNote(id: string, text: string) {
    const idx = this.notes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error("Nota no encontrada");
    this.notes[idx] = { ...this.notes[idx], text };
    return withLatency(this.notes[idx]);
  }

  deleteNote(id: string) {
    this.notes = this.notes.filter((n) => n.id !== id);
    return withLatency(undefined);
  }

  deleteConversation(conversationId: string) {
    this.conversations = this.conversations.filter((c) => c.id !== conversationId);
    this.notes = this.notes.filter((n) => n.conversationId !== conversationId);
    return withLatency(undefined);
  }

  deleteAllConversations() {
    const n = this.conversations.length;
    this.conversations = [];
    this.notes = [];
    return withLatency(n);
  }

  getAutoAssignSettings() {
    return Promise.resolve({ ...this.autoAssign });
  }

  setAutoAssignEnabled(enabled: boolean) {
    this.autoAssign = { ...this.autoAssign, enabled };
    return Promise.resolve({ ...this.autoAssign });
  }

  autoAssignIfNeeded() {
    return Promise.resolve();
  }

  autoAssignAllPending() {
    return Promise.resolve();
  }

  ensurePendingAssigned() {
    return Promise.resolve();
  }
}

export function getAdminLeadsRepository(): AdminLeadsRepository {
  if (hasDatabase()) return new PostgresAdminLeadsRepository();
  return new MockAdminLeadsRepository();
}
