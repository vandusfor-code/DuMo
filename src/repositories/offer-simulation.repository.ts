import "server-only";

import type {
  OfferGenerationResult,
  OfferSimulationHistoryItem,
  OfferSimulationRecord,
  OfferSimulationRequest,
} from "@/types/offer-engine";
import { normalizeOfferSaleType } from "@/types/offer-engine";
import { ensureSchema, getSql, hasDatabase, withDbRetry } from "@/server/db/client";

export interface OfferSimulationRepository {
  insert(
    input: OfferSimulationRequest,
    result: OfferGenerationResult,
    meta: { companyId: string; createdBy: string; createdByName: string },
  ): Promise<OfferSimulationRecord>;
  listByLead(leadId: string, companyId: string): Promise<OfferSimulationHistoryItem[]>;
  getById(id: string, companyId: string): Promise<OfferSimulationRecord | null>;
}

const mockStore: OfferSimulationRecord[] = [];

function summarizeRequested(input: OfferSimulationRequest): string {
  const parts = [`${input.requestedLines} línea${input.requestedLines === 1 ? "" : "s"}`];
  if (input.wantsEquipment) parts.push("Con equipo");
  return parts.join(" + ");
}

function summarizeResult(result: OfferGenerationResult): string {
  if (result.viableCount === 0) return "Sin ofertas viables";
  return `${result.viableCount} oferta${result.viableCount === 1 ? "" : "s"} viable${result.viableCount === 1 ? "" : "s"}`;
}

function rowToRecord(row: Record<string, unknown>): OfferSimulationRecord {
  const recommendationJson = row.recommendation_json as OfferGenerationResult;
  const normalizedJson: OfferGenerationResult = {
    ...recommendationJson,
    saleType: normalizeOfferSaleType(String(recommendationJson.saleType ?? row.sale_type)),
  };
  return {
    ...normalizedJson,
    id: String(row.id),
    leadId: String(row.lead_id),
    companyId: String(row.company_id),
    createdBy: String(row.created_by),
    createdByName: String(row.created_by_name ?? ""),
    createdAt: String(row.created_at),
    recommendationJson: normalizedJson,
  };
}

class MockOfferSimulationRepository implements OfferSimulationRepository {
  async insert(
    input: OfferSimulationRequest,
    result: OfferGenerationResult,
    meta: { companyId: string; createdBy: string; createdByName: string },
  ): Promise<OfferSimulationRecord> {
    const id = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record: OfferSimulationRecord = {
      ...result,
      id,
      leadId: input.leadId,
      companyId: meta.companyId,
      createdBy: meta.createdBy,
      createdByName: meta.createdByName,
      createdAt: new Date().toISOString(),
      recommendationJson: result,
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
        requestedSummary: summarizeRequested({
          leadId: s.leadId,
          saleType: s.saleType,
          requestedLines: s.requestedLines,
          lineCredit: s.lineCredit,
          equipmentCredit: s.equipmentCredit,
          wantsEquipment: s.wantsEquipment,
        }),
        resultSummary: summarizeResult(s),
        viableCount: s.viableCount,
      }));
  }

  async getById(id: string, _companyId: string): Promise<OfferSimulationRecord | null> {
    return mockStore.find((s) => s.id === id) ?? null;
  }
}

class PostgresOfferSimulationRepository implements OfferSimulationRepository {
  async insert(
    input: OfferSimulationRequest,
    result: OfferGenerationResult,
    meta: { companyId: string; createdBy: string; createdByName: string },
  ): Promise<OfferSimulationRecord> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new Error("Base de datos no configurada");

    const id = `sim-${Date.now()}`;
    const now = new Date().toISOString();
    const topOffer = result.offers[0];

    const wantsEquipment = result.wantsEquipment;
    const equipmentCredit = result.equipmentCredit;

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
          ${input.saleType}, ${input.requestedLines}, ${result.evaluatedLines},
          ${wantsEquipment}, ${Boolean(topOffer?.eligibleEquipment.length)},
          ${JSON.stringify({ requestedLines: input.requestedLines, wantsEquipment })}::jsonb,
          ${JSON.stringify(topOffer ?? null)}::jsonb,
          ${input.lineCredit}, ${equipmentCredit},
          ${topOffer?.planMonthlyTotal ?? 0}, ${topOffer?.planMonthlyTotal ?? 0},
          ${topOffer?.lineRemaining ?? 0},
          ${result.optimized ? "REDUCE_LINES" : "NONE"}, ${result.viableCount > 0 ? "APPROVED" : "REJECTED"},
          ${result.optimizationMessage ?? summarizeResult(result)}, ${JSON.stringify(result)}::jsonb
        )
      `,
    );

    return {
      ...result,
      id,
      leadId: input.leadId,
      companyId: meta.companyId,
      createdBy: meta.createdBy,
      createdByName: meta.createdByName,
      createdAt: now,
      recommendationJson: result,
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
        requestedSummary: summarizeRequested({
          leadId: rec.leadId,
          saleType: rec.saleType,
          requestedLines: rec.requestedLines,
          lineCredit: rec.lineCredit,
          equipmentCredit: rec.equipmentCredit,
          wantsEquipment: rec.wantsEquipment,
        }),
        resultSummary: summarizeResult(rec),
        viableCount: rec.viableCount,
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
