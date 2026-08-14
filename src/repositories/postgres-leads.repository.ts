import "server-only";
import type { AdvisorScope } from "@/lib/advisor-scope";
import type { LatestGestionDraft, Lead, LeadType, Plan, SaveLeadInput } from "@/types/lead";
import type { GeneratedSalesScript } from "@/types/sales-script";
import type {
  AdminAdvisor,
  AdminConversation,
  AdminLeadDetail,
  AssignAdvisorInput,
  ClientProfile,
  LeadNote,
  UpsertLeadNoteInput,
} from "@/types/admin-lead";
import type { ChatMessage } from "@/types/conversation";
import { getAdminLeadsRepository } from "@/repositories/admin-leads.repository";
import { commercialPlansService } from "@/services/commercial-plans.service";
import { businessDateISO } from "@/lib/date";
import { getDefaultClientProfile } from "@/data/mock/admin-leads.mock";
import { ensureSchema, getSql, withDbRetry } from "@/server/db/client";
import type postgres from "postgres";

function buildLead(id: string, input: SaveLeadInput, advisorId: string): Lead {
  return {
    id,
    conversationId: input.conversationId,
    phone: input.phone,
    customerName: input.customerName,
    rut: input.rut,
    status: input.type,
    advisorId,
    type: input.type,
    notes: input.notes,
    createdAt: businessDateISO(),
  };
}

export class PostgresLeadRepository {
  async getPlans(): Promise<Plan[]> {
    return commercialPlansService.getAdvisorPlanOptions();
  }

  async saveLead(input: SaveLeadInput, scope?: AdvisorScope | null): Promise<Lead> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new Error("Base de datos no configurada");

    const id = `LEAD-${Date.now()}`;
    const now = new Date().toISOString();
    const adminLeads = getAdminLeadsRepository();
    const detail = await adminLeads.getDetail(input.conversationId).catch(() => null);
    const advisorId =
      scope?.id ?? detail?.conversation.assignedAdvisor?.id ?? "";
    const advisorName =
      scope?.name ?? detail?.conversation.assignedAdvisor?.name ?? "";

    await withDbRetry(() =>
      sql`
        INSERT INTO lead_gestiones (
          id, conversation_id, phone, customer_name, rut, gestion_type,
          notes, advisor_id, advisor_name, lines, created_at, folio_number
        ) VALUES (
          ${id}, ${input.conversationId}, ${input.phone}, ${input.customerName},
          ${input.rut}, ${input.type}, ${input.notes}, ${advisorId || null},
          ${advisorName}, ${JSON.stringify(input.lines)}, ${now}, ${input.folioNumber?.trim() ?? ""}
        )
      `,
    );

    // Cualquier gestión guardada significa que hubo contacto con el cliente —
    // antes esto solo avanzaba admin_status en flujo de venta, así que
    // tipificar y "Guardar y cerrar" en cualquier otro tipo (consulta,
    // seguimiento, etc.) dejaba el lead pegado en "Nuevo" para siempre en el
    // panel admin, aunque la conversación ya estuviera cerrada. Solo avanza
    // desde nuevo/asignado — nunca retrocede un lead que ya iba más adelante
    // en el embudo (negociación/convertido/perdido).
    await withDbRetry(() =>
      sql`
        UPDATE lead_conversations
        SET admin_status = ${"contactado"}
        WHERE id = ${input.conversationId}
          AND admin_status IN ('nuevo', 'asignado')
      `,
    );
    await withDbRetry(() =>
      sql`
        UPDATE lead_conversations
        SET current_tipification_slug = ${input.type}
        WHERE id = ${input.conversationId}
      `,
    );

    return buildLead(id, input, advisorId || "unknown");
  }

  async saveSalesScript(gestionId: string, script: GeneratedSalesScript): Promise<void> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return;
    await withDbRetry(() =>
      sql`
        UPDATE lead_gestiones
        SET sales_script = ${sql.json(script as unknown as postgres.JSONValue)}
        WHERE id = ${gestionId}
      `,
    );
  }

  async getLatestSalesScript(conversationId: string): Promise<GeneratedSalesScript | null> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return null;
    const rows = await withDbRetry(() =>
      sql<{ sales_script: GeneratedSalesScript | null }[]>`
        SELECT sales_script
        FROM lead_gestiones
        WHERE conversation_id = ${conversationId}
          AND sales_script IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      `,
    );
    return rows[0]?.sales_script ?? null;
  }

  async getSalesScriptByGestionId(gestionId: string): Promise<GeneratedSalesScript | null> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return null;
    const rows = await withDbRetry(() =>
      sql<{ sales_script: GeneratedSalesScript | null }[]>`
        SELECT sales_script
        FROM lead_gestiones
        WHERE id = ${gestionId}
        LIMIT 1
      `,
    );
    return rows[0]?.sales_script ?? null;
  }

  async getLatestGestionDraft(conversationId: string): Promise<LatestGestionDraft | null> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return null;
    const rows = await withDbRetry(() =>
      sql<
        {
          id: string;
          customer_name: string;
          rut: string;
          gestion_type: string;
          notes: string;
          lines: SaveLeadInput["lines"] | null;
          sales_script: GeneratedSalesScript | null;
          folio_number: string | null;
        }[]
      >`
        SELECT id, customer_name, rut, gestion_type, notes, lines, sales_script, folio_number
        FROM lead_gestiones
        WHERE conversation_id = ${conversationId}
        ORDER BY created_at DESC
        LIMIT 1
      `,
    );
    const row = rows[0];
    if (!row) return null;
    return {
      gestionId: row.id,
      customerName: row.customer_name ?? "",
      rut: row.rut ?? "",
      type: row.gestion_type as LeadType,
      notes: row.notes ?? "",
      lines: Array.isArray(row.lines) ? row.lines : [],
      hasScript: row.sales_script != null,
      folioNumber: row.folio_number ?? "",
    };
  }

  listAdminConversations(): Promise<AdminConversation[]> {
    return getAdminLeadsRepository().listConversations();
  }

  getAdminDetail(conversationId: string): Promise<AdminLeadDetail> {
    return getAdminLeadsRepository().getDetail(conversationId);
  }

  listAdvisors(): Promise<AdminAdvisor[]> {
    return getAdminLeadsRepository().listAdvisors();
  }

  assignAdvisor(input: AssignAdvisorInput): Promise<AdminConversation> {
    return getAdminLeadsRepository().assignAdvisor(input);
  }

  listNotes(conversationId: string): Promise<LeadNote[]> {
    return getAdminLeadsRepository().listNotes(conversationId);
  }

  addNote(input: UpsertLeadNoteInput): Promise<LeadNote> {
    return getAdminLeadsRepository().addNote(input);
  }

  updateNote(id: string, text: string): Promise<LeadNote> {
    return getAdminLeadsRepository().updateNote(id, text);
  }

  deleteNote(id: string): Promise<void> {
    return getAdminLeadsRepository().deleteNote(id);
  }

  getClientProfile(conversationId: string): Promise<ClientProfile> {
    return getAdminLeadsRepository()
      .getDetail(conversationId)
      .then((d) => d.client)
      .catch(() => getDefaultClientProfile(conversationId));
  }

  getMessages(conversationId: string): Promise<ChatMessage[]> {
    return getAdminLeadsRepository().getMessages(conversationId);
  }
}
