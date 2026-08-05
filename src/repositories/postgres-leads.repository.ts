import "server-only";
import type { Lead, Plan, SaveLeadInput } from "@/types/lead";
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
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import { businessDateISO } from "@/lib/date";
import { getDefaultClientProfile } from "@/data/mock/admin-leads.mock";
import { ensureSchema, getSql, withDbRetry } from "@/server/db/client";

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
    const config = await getCommercialConfigurationRepository().getSnapshot();
    const plans = config.plans
      .filter((p) => p.status === "active")
      .map((p) => ({ id: p.id, name: p.name, womValue: p.womValue }));
    return plans.length > 0 ? plans : [{ id: "default", name: "Plan estándar" }];
  }

  async saveLead(input: SaveLeadInput): Promise<Lead> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new Error("Base de datos no configurada");

    const id = `LEAD-${Date.now()}`;
    const now = new Date().toISOString();
    const adminLeads = getAdminLeadsRepository();
    const detail = await adminLeads.getDetail(input.conversationId).catch(() => null);
    const advisorId = detail?.conversation.assignedAdvisor?.id ?? "";
    const advisorName = detail?.conversation.assignedAdvisor?.name ?? "";

    await withDbRetry(() =>
      sql`
        INSERT INTO lead_gestiones (
          id, conversation_id, phone, customer_name, rut, gestion_type,
          notes, advisor_id, advisor_name, lines, created_at
        ) VALUES (
          ${id}, ${input.conversationId}, ${input.phone}, ${input.customerName},
          ${input.rut}, ${input.type}, ${input.notes}, ${advisorId || null},
          ${advisorName}, ${JSON.stringify(input.lines)}, ${now}
        )
      `,
    );

    if (input.type === "venta") {
      await withDbRetry(() =>
        sql`
          UPDATE lead_conversations
          SET admin_status = ${"contactado"}
          WHERE id = ${input.conversationId}
        `,
      );
    }

    return buildLead(id, input, advisorId || "unknown");
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
