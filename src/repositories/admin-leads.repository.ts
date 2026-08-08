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
import { withLatency } from "@/lib/mock";
import { getConfig, setConfig } from "@/server/db/app-config";
import { ensureSchema, getSql, hasDatabase, withDbRetry, withQueryTimeout } from "@/server/db/client";

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
  last_message: string;
  last_message_at: string;
  last_message_direction?: string;
  unread: number;
  online: boolean;
  assigned_advisor_id: string | null;
  assigned_advisor_name: string | null;
  admin_status: string;
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
    rut: "",
    channel: resolveConversationChannel(r.id),
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
  };
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

class PostgresAdminLeadsRepository implements AdminLeadsRepository {
  private async fetchRows(advisorId?: string): Promise<ConvRow[]> {
    await ensureSchema();
    const sql = requireSql();
    return withQueryTimeout(
      withDbRetry(() =>
        advisorId
          ? sql`
              SELECT id, phone, customer_name, last_message, last_message_at, last_message_direction,
                     unread, online, assigned_advisor_id, assigned_advisor_name, admin_status
              FROM lead_conversations
              WHERE assigned_advisor_id = ${advisorId}
              ORDER BY last_message_at DESC
            `
          : sql`
              SELECT id, phone, customer_name, last_message, last_message_at, last_message_direction,
                     unread, online, assigned_advisor_id, assigned_advisor_name, admin_status
              FROM lead_conversations
              ORDER BY last_message_at DESC
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
    const rows = await this.fetchRows();
    return rows.map(mapConversation);
  }

  async listConversationsForAdvisor(advisorId: string) {
    const rows = await this.fetchRows(advisorId);
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

    await sql`
      UPDATE lead_conversations SET
        assigned_advisor_id = ${advisor.id},
        assigned_advisor_name = ${advisor.name},
        admin_status = 'asignado'
      WHERE id = ${input.conversationId}
    `;

    const rows = await this.fetchRows();
    const conv = rows.find((r) => r.id === input.conversationId);
    if (!conv) throw new Error("Conversación no encontrada");
    return mapConversation(conv);
  }

  async getDetail(conversationId: string): Promise<AdminLeadDetail> {
    const rows = await this.fetchRows();
    const row = rows.find((r) => r.id === conversationId);
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
   * Asigna conversaciones sin asesora repartiéndolas en round-robin.
   *
   * Una SOLA sentencia atómica: evita las condiciones de carrera entre
   * instancias serverless (dos no pueden asignar el mismo lead) y elimina las
   * ~5 consultas por conversación del enfoque anterior, que saturaban el pool.
   *
   * `onlyOnline=true` reparte entre las asesoras conectadas al CRM en los
   * últimos 10 min; si no hay ninguna, se reintenta con todas las activas.
   */
  private async assignPendingRoundRobin(
    conversationId: string | null,
    onlyOnline: boolean,
  ): Promise<number> {
    const sql = requireSql();
    const rows = await withQueryTimeout(
      sql<{ id: string }[]>`
        WITH advisors AS (
          SELECT id, name,
                 (row_number() OVER (ORDER BY last_seen_at DESC NULLS LAST, name)) - 1 AS rn,
                 (count(*) OVER ()) AS total
          FROM users
          WHERE role = 'asesora' AND active = true
            AND (
              ${onlyOnline}::boolean IS FALSE
              OR (last_seen_at IS NOT NULL AND last_seen_at > now() - interval '10 minutes')
            )
        ),
        pending AS (
          SELECT id, (row_number() OVER (ORDER BY last_message_at)) - 1 AS rn
          FROM lead_conversations
          WHERE assigned_advisor_id IS NULL
            AND (${conversationId}::text IS NULL OR id = ${conversationId}::text)
          LIMIT 200
        )
        UPDATE lead_conversations c
        SET assigned_advisor_id = a.id,
            assigned_advisor_name = a.name,
            admin_status = 'asignado'
        FROM pending p, advisors a
        WHERE c.id = p.id
          AND c.assigned_advisor_id IS NULL
          AND a.rn = (p.rn % a.total)
        RETURNING c.id
      `,
      6000,
    );
    return rows.length;
  }

  /** Asigna una conversación concreta (la llama el webhook al entrar un mensaje). */
  async autoAssignIfNeeded(conversationId: string) {
    const settings = await this.getAutoAssignSettings();
    if (!settings.enabled) return;
    await ensureSchema();
    const assigned = await this.assignPendingRoundRobin(conversationId, true);
    if (assigned === 0) {
      // Nadie conectado: reparte entre todas las asesoras activas.
      await this.assignPendingRoundRobin(conversationId, false);
    }
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
    const assigned = await this.assignPendingRoundRobin(null, true);
    if (assigned === 0) {
      await this.assignPendingRoundRobin(null, false);
    }
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
