import "server-only";
import type { Lead, Plan, SaveLeadInput } from "@/types/lead";
import { PLANS_MOCK } from "@/data/mock/leads.mock";
import { withLatency } from "@/lib/mock";
import { businessDateISO } from "@/lib/date";
import { getSheetsClient, type GoogleSheetsClient } from "@/server/google/sheets-client";

export interface LeadRepository {
  getPlans(): Promise<Plan[]>;
  saveLead(input: SaveLeadInput): Promise<Lead>;
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
  getPlans() {
    return withLatency(PLANS_MOCK);
  }
  saveLead(input: SaveLeadInput) {
    return withLatency(buildLead(`LEAD-${Date.now()}`, input));
  }
}

/* --------------------------- Sheets ----------------------------- */

class SheetsLeadRepository implements LeadRepository {
  constructor(private readonly client: GoogleSheetsClient) {}

  async getPlans(): Promise<Plan[]> {
    const rows = await this.client.getRecords("Planes");
    const plans = rows
      .filter((r) => r.id || r.nombre)
      .map<Plan>((r) => ({ id: r.id || r.nombre, name: r.nombre || r.id }));
    return plans.length > 0 ? plans : PLANS_MOCK;
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
}

export function getLeadRepository(): LeadRepository {
  const client = getSheetsClient();
  return client ? new SheetsLeadRepository(client) : new MockLeadRepository();
}
