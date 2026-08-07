import "server-only";

import type {
  OfferRecommendation,
  OfferSaleType,
  OfferSimulationHistoryItem,
  OfferSimulationRecord,
  OfferSimulationRequest,
} from "@/types/offer-engine";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import { ensureSchema, getSql, hasDatabase, withDbRetry } from "@/server/db/client";

export interface OfferSimulationRepository {
  insert(
    input: OfferSimulationRequest,
    recommendation: OfferRecommendation,
    meta: { companyId: string; createdBy: string; createdByName: string },
  ): Promise<OfferSimulationRecord>;
  listByLead(leadId: string, companyId: string): Promise<OfferSimulationHistoryItem[]>;
  getById(id: string, companyId: string): Promise<OfferSimulationRecord | null>;
}

const mockStore: OfferSimulationRecord[] = [];

function summarizeRequested(rec: OfferSimulationRecord): string {
  const parts: string[] = [`${rec.requestedLines} línea${rec.requestedLines === 1 ? "" : "s"}`];
  if (rec.requestedEquipment) parts.push("Equipo");
  return parts.join(" + ");
}

function summarizeResult(rec: OfferSimulationRecord): string {
  if (rec.status === "APPROVED") return "Aprobada";
  if (rec.status === "REJECTED") return "Rechazada";
  const lines =
    rec.approvedLines !== rec.requestedLines
      ? `Optimizada a ${rec.approvedLines}`
      : "Optimizada";
  if (rec.removedEquipment && rec.removedLines > 0) {
    return `${lines} (sin equipo)`;
  }
  if (rec.removedEquipment) return "Optimizada (sin equipo)";
  return lines;
}

function rowToRecord(row: Record<string, unknown>): OfferSimulationRecord {
  const recommendationJson = row.recommendation_json as OfferRecommendation;
  return {
    ...recommendationJson,
    id: String(row.id),
    leadId: String(row.lead_id),
    companyId: String(row.company_id),
    createdBy: String(row.created_by),
    createdByName: String(row.created_by_name ?? ""),
    createdAt: String(row.created_at),
    saleType: row.sale_type as OfferSaleType,
    recommendationJson,
  };
}

class MockOfferSimulationRepository implements OfferSimulationRepository {
  async insert(
    input: OfferSimulationRequest,
    recommendation: OfferRecommendation,
    meta: { companyId: string; createdBy: string; createdByName: string },
  ): Promise<OfferSimulationRecord> {
    const id = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record: OfferSimulationRecord = {
      ...recommendation,
      id,
      leadId: input.leadId,
      companyId: meta.companyId,
      createdBy: meta.createdBy,
      createdByName: meta.createdByName,
      createdAt: new Date().toISOString(),
      saleType: input.saleType,
      recommendationJson: recommendation,
    };
    mockStore.unshift(record);
    return record;
  }

  async listByLead(leadId: string, _companyId: string): Promise<OfferSimulationHistoryItem[]> {
    return mockStore
      .filter((s) => s.leadId === leadId)
      .map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        saleType: s.saleType,
        requestedSummary: summarizeRequested(s),
        resultSummary: summarizeResult(s),
        status: s.status,
      }));
  }

  async getById(id: string, _companyId: string): Promise<OfferSimulationRecord | null> {
    return mockStore.find((s) => s.id === id) ?? null;
  }
}

class PostgresOfferSimulationRepository implements OfferSimulationRepository {
  async insert(
    input: OfferSimulationRequest,
    recommendation: OfferRecommendation,
    meta: { companyId: string; createdBy: string; createdByName: string },
  ): Promise<OfferSimulationRecord> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new Error("Base de datos no configurada");

    const id = `sim-${Date.now()}`;
    const now = new Date().toISOString();

    await withDbRetry(() =>
      sql`
        INSERT INTO offer_simulations (
          id, lead_id, company_id, created_by, created_by_name, created_at,
          sale_type, requested_lines, approved_lines,
          requested_equipment, approved_equipment,
          requested_plan_json, approved_plan_json,
          line_credit, equipment_credit,
          requested_total, approved_total, remaining_credit,
          optimization_type, status, recommendation, recommendation_json
        ) VALUES (
          ${id}, ${input.leadId}, ${meta.companyId}, ${meta.createdBy},
          ${meta.createdByName}, ${now},
          ${input.saleType}, ${input.requestedLines}, ${recommendation.approvedLines},
          ${recommendation.requestedEquipment}, ${recommendation.approvedEquipment},
          ${JSON.stringify(recommendation.requestedPlan)}::jsonb,
          ${JSON.stringify(recommendation.approvedPlan)}::jsonb,
          ${input.lineCredit}, ${input.equipmentCredit},
          ${recommendation.requestedMonthlyValue}, ${recommendation.approvedMonthlyValue},
          ${recommendation.remainingCredit},
          ${recommendation.optimizationType}, ${recommendation.status},
          ${recommendation.recommendation}, ${JSON.stringify(recommendation)}::jsonb
        )
      `,
    );

    return {
      ...recommendation,
      id,
      leadId: input.leadId,
      companyId: meta.companyId,
      createdBy: meta.createdBy,
      createdByName: meta.createdByName,
      createdAt: now,
      saleType: input.saleType,
      recommendationJson: recommendation,
    };
  }

  async listByLead(leadId: string, companyId: string): Promise<OfferSimulationHistoryItem[]> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return [];

    const rows = await withDbRetry(() =>
      sql`
        SELECT * FROM offer_simulations
        WHERE lead_id = ${leadId} AND company_id = ${companyId}
        ORDER BY created_at DESC
        LIMIT 50
      `,
    );

    return (rows as Record<string, unknown>[]).map((row) => {
      const rec = rowToRecord(row);
      return {
        id: rec.id,
        createdAt: rec.createdAt,
        saleType: rec.saleType,
        requestedSummary: summarizeRequested(rec),
        resultSummary: summarizeResult(rec),
        status: rec.status,
      };
    });
  }

  async getById(id: string, companyId: string): Promise<OfferSimulationRecord | null> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return null;

    const rows = await withDbRetry(() =>
      sql`
        SELECT * FROM offer_simulations
        WHERE id = ${id} AND company_id = ${companyId}
        LIMIT 1
      `,
    );

    const row = (rows as Record<string, unknown>[])[0];
    return row ? rowToRecord(row) : null;
  }
}

export function getOfferSimulationRepository(): OfferSimulationRepository {
  if (hasDatabase()) return new PostgresOfferSimulationRepository();
  return new MockOfferSimulationRepository();
}

export { DEFAULT_COMPANY_ID };
