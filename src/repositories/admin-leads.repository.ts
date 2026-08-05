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
  getAutoAssignSettings(): Promise<AutoAssignSettings>;
  setAutoAssignEnabled(enabled: boolean): Promise<AutoAssignSettings>;
  autoAssignIfNeeded(conversationId: string): Promise<void>;
  autoAssignAllPending(): Promise<void>;
}

type ConvRow = {
  id: string;
  phone: string;
  customer_name: string;
  last_message: string;
  last_message_at: string;
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
  return {
    id: r.id,
    customerName: r.customer_name || r.phone,
    phone: r.phone,
    rut: "",
    lastMessage: r.last_message,
    lastMessageTime: formatChatTime(r.last_message_at),
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
              SELECT id, phone, customer_name, last_message, last_message_at, unread, online,
                     assigned_advisor_id, assigned_advisor_name, admin_status
              FROM lead_conversations
              WHERE assigned_advisor_id = ${advisorId}
              ORDER BY last_message_at DESC
            `
          : sql`
              SELECT id, phone, customer_name, last_message, last_message_at, unread, online,
                     assigned_advisor_id, assigned_advisor_name, admin_status
              FROM lead_conversations
              ORDER BY last_message_at DESC
            `,
      ),
      8000,
    ) as Promise<ConvRow[]>;
  }

  async listConversations() {
    await this.autoAssignAllPending();
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

  private async pickAdvisorForAutoAssign() {
    await ensureSchema();
    const sql = requireSql();
    const online = await sql`
      SELECT id, name, avatar_url
      FROM users
      WHERE role = 'asesora' AND active = true
        AND last_seen_at IS NOT NULL
        AND last_seen_at > now() - interval '10 minutes'
      ORDER BY last_seen_at DESC
    `;
    const pool =
      online.length > 0
        ? online
        : await sql`
            SELECT id, name, avatar_url
            FROM users
            WHERE role = 'asesora' AND active = true
            ORDER BY name ASC
          `;
    if (pool.length === 0) return null;
    const settings = await this.getAutoAssignSettings();
    const idx = settings.lastAdvisorIndex % pool.length;
    const picked = pool[idx] as { id: string; name: string };
    await setConfig(AUTO_ASSIGN_KEY, {
      ...settings,
      lastAdvisorIndex: (idx + 1) % pool.length,
    });
    return picked;
  }

  async autoAssignIfNeeded(conversationId: string) {
    const settings = await this.getAutoAssignSettings();
    if (!settings.enabled) return;

    await ensureSchema();
    const sql = requireSql();
    const rows = await sql`
      SELECT assigned_advisor_id FROM lead_conversations WHERE id = ${conversationId} LIMIT 1
    `;
    const existing = rows[0] as { assigned_advisor_id: string | null } | undefined;
    if (existing?.assigned_advisor_id) return;

    const advisor = await this.pickAdvisorForAutoAssign();
    if (!advisor) return;

    await sql`
      UPDATE lead_conversations SET
        assigned_advisor_id = ${advisor.id},
        assigned_advisor_name = ${advisor.name},
        admin_status = 'asignado'
      WHERE id = ${conversationId}
    `;
  }

  async autoAssignAllPending() {
    const settings = await this.getAutoAssignSettings();
    if (!settings.enabled) return;

    await ensureSchema();
    const sql = requireSql();
    const pending = await withQueryTimeout(
      sql<{ id: string }[]>`
        SELECT id FROM lead_conversations
        WHERE assigned_advisor_id IS NULL
        ORDER BY last_message_at DESC
        LIMIT 50
      `,
      5000,
    );
    for (const row of pending) {
      await this.autoAssignIfNeeded(row.id);
    }
  }
}

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
}

export function getAdminLeadsRepository(): AdminLeadsRepository {
  if (hasDatabase()) return new PostgresAdminLeadsRepository();
  return new MockAdminLeadsRepository();
}
