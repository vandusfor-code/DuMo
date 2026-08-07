import "server-only";
import type { LatestGestionDraft, Lead, Plan, SaveLeadInput } from "@/types/lead";
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
import { commercialPlansService } from "@/services/commercial-plans.service";
import {
  buildTimeline,
  getDefaultClientProfile,
  getMockMessages,
} from "@/data/mock/admin-leads.mock";
import { getAuthRepository } from "@/repositories/auth.repository";
import { withLatency } from "@/lib/mock";
import { businessDateISO } from "@/lib/date";
import { getSheetsClient, type GoogleSheetsClient } from "@/server/google/sheets-client";

export interface LeadRepository {
  getPlans(): Promise<Plan[]>;
  saveLead(input: SaveLeadInput): Promise<Lead>;
  saveSalesScript(gestionId: string, script: GeneratedSalesScript): Promise<void>;
  getLatestSalesScript(conversationId: string): Promise<GeneratedSalesScript | null>;
  getSalesScriptByGestionId(gestionId: string): Promise<GeneratedSalesScript | null>;
  getLatestGestionDraft(conversationId: string): Promise<LatestGestionDraft | null>;
  /** Admin CRM */
  listAdminConversations(): Promise<AdminConversation[]>;
  getAdminDetail(conversationId: string): Promise<AdminLeadDetail>;
  listAdvisors(): Promise<AdminAdvisor[]>;
  assignAdvisor(input: AssignAdvisorInput): Promise<AdminConversation>;
  listNotes(conversationId: string): Promise<LeadNote[]>;
  addNote(input: UpsertLeadNoteInput): Promise<LeadNote>;
  updateNote(id: string, text: string): Promise<LeadNote>;
  deleteNote(id: string): Promise<void>;
  getClientProfile(conversationId: string): Promise<ClientProfile>;
  getMessages(conversationId: string): Promise<ChatMessage[]>;
}

const ADVISOR = "María López";

function buildLead(id: string, input: SaveLeadInput): Lead {
  return {
    id,
    conversationId: input.conversationId,
    phone: input.phone,
    customerName: input.customerName,
    rut: input.rut,
    status: input.type,
    advisorId: ADVISOR,
    type: input.type,
    notes: input.notes,
    createdAt: businessDateISO(),
  };
}

/* ----------------------------- Mock ----------------------------- */

class MockLeadRepository implements LeadRepository {
  private conversations: AdminConversation[] = [];
  private notes: LeadNote[] = [];
  private scriptsByConversation = new Map<string, GeneratedSalesScript>();
  private scriptsByGestionId = new Map<string, GeneratedSalesScript>();

  async getPlans() {
    return withLatency(await commercialPlansService.getAdvisorPlanOptions());
  }
  saveLead(input: SaveLeadInput) {
    return withLatency(buildLead(`LEAD-${Date.now()}`, input));
  }

  saveSalesScript(gestionId: string, script: GeneratedSalesScript) {
    this.scriptsByConversation.set(script.conversationId, script);
    this.scriptsByGestionId.set(gestionId, script);
    return withLatency(undefined);
  }

  getLatestSalesScript(conversationId: string) {
    return withLatency(this.scriptsByConversation.get(conversationId) ?? null);
  }

  getSalesScriptByGestionId(gestionId: string) {
    return withLatency(this.scriptsByGestionId.get(gestionId) ?? null);
  }

  getLatestGestionDraft() {
    return withLatency(null);
  }

  listAdminConversations() {
    return withLatency([...this.conversations]);
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

  async getAdminDetail(conversationId: string): Promise<AdminLeadDetail> {
    const conversation = this.conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Conversación no encontrada");
    return withLatency({
      conversation,
      messages: getMockMessages(conversationId),
      notes: this.notes.filter((n) => n.conversationId === conversationId),
      timeline: buildTimeline(conversationId),
      client: getDefaultClientProfile(conversationId),
    });
  }

  async assignAdvisor(input: AssignAdvisorInput) {
    const idx = this.conversations.findIndex((c) => c.id === input.conversationId);
    if (idx === -1) throw new Error("Conversación no encontrada");
    const advisor = (await getAuthRepository().listUsers()).find((a) => a.id === input.advisorId);
    if (!advisor) throw new Error("Asesora no encontrada");
    this.conversations[idx] = {
      ...this.conversations[idx],
      assignedAdvisor: { id: advisor.id, name: advisor.name, avatarUrl: advisor.avatarUrl || undefined },
      status: this.conversations[idx].status === "nuevo" ? "asignado" : this.conversations[idx].status,
    };
    return withLatency(this.conversations[idx]);
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

  getClientProfile(conversationId: string) {
    return withLatency(getDefaultClientProfile(conversationId));
  }
}

/* --------------------------- Sheets ----------------------------- */

class SheetsLeadRepository implements LeadRepository {
  constructor(private readonly client: GoogleSheetsClient) {}

  async getPlans(): Promise<Plan[]> {
    return commercialPlansService.getAdvisorPlanOptions();
  }

  async saveLead(input: SaveLeadInput): Promise<Lead> {
    const id = `LEAD-${Date.now()}`;
    const lead = buildLead(id, input);

    await this.client.appendRecord("Leads", {
      id,
      conversationId: input.conversationId,
      telefono: input.phone,
      cliente: input.customerName,
      rut: input.rut,
      tipoGestion: input.type,
      asesora: ADVISOR,
      notas: input.notes,
      creadoEn: new Date().toISOString(),
    });

    if (input.lines.length > 0) {
      await this.client.appendRecords(
        "LineasLead",
        input.lines.map((l, i) => ({
          id: `${id}-L${i + 1}`,
          leadId: id,
          numeroLinea: l.phone,
          tipoVenta: l.saleType,
          plan: l.planId,
          equipo: l.equipment,
        })),
      );
    }

    await this.client.log("info", "Gestión guardada", { leadId: id, type: input.type });
    return lead;
  }

  listAdminConversations() {
    return withLatency([]);
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

  getAdminDetail(conversationId: string) {
    return Promise.reject(new Error("Conversación no encontrada"));
  }

  assignAdvisor(_input: AssignAdvisorInput): Promise<AdminConversation> {
    return Promise.reject(new Error("Asignación admin no implementada en Sheets aún"));
  }

  listNotes(_conversationId: string) {
    return withLatency([]);
  }

  addNote(_input: UpsertLeadNoteInput): Promise<LeadNote> {
    return Promise.reject(new Error("Notas admin no implementadas en Sheets aún"));
  }

  updateNote(_id: string, _text: string): Promise<LeadNote> {
    return Promise.reject(new Error("Notas admin no implementadas en Sheets aún"));
  }

  deleteNote(_id: string): Promise<void> {
    return Promise.reject(new Error("Notas admin no implementadas en Sheets aún"));
  }

  getClientProfile(conversationId: string) {
    return withLatency(getDefaultClientProfile(conversationId));
  }

  saveSalesScript() {
    return withLatency(undefined);
  }

  getLatestSalesScript() {
    return withLatency(null);
  }

  getSalesScriptByGestionId() {
    return withLatency(null);
  }

  getLatestGestionDraft() {
    return withLatency(null);
  }
}

import { PostgresLeadRepository } from "@/repositories/postgres-leads.repository";
import { hasDatabase } from "@/server/db/client";

export function getLeadRepository(): LeadRepository {
  if (hasDatabase()) return new PostgresLeadRepository();
  return new MockLeadRepository();
}
