import "server-only";
import type {
  CloseDuoSaleResult,
  CreateDuoSaleInput,
  DuoClosingNote,
  DuoSale,
  DuoSaleStatus,
} from "@/types/duo-sale";
import { ensureSchema, getSql, hasDatabase, withDbRetry, withQueryTimeout } from "@/server/db/client";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import { findPlanCommission } from "@/data/mock/commercial-config.mock";
import { canonicalToAdminType } from "@/server/db/sales-mappers";
import { mapLeadLineToSaleType } from "@/lib/lead-save";
import type { LeadSaleType } from "@/types/lead";

export interface DuoSalesRepository {
  create(input: CreateDuoSaleInput): Promise<DuoSale>;
  /** Vista admin — todas las Operación Duo activas (no cerradas primero). */
  listAll(): Promise<DuoSale[]>;
  /** Vista asesora de cierre — solo lo asignado a ella. */
  listForClosingAdvisor(advisorId: string): Promise<DuoSale[]>;
  getById(id: string): Promise<DuoSale | null>;
  assign(id: string, advisor: { id: string; name: string }): Promise<DuoSale>;
  addClosingNote(id: string, note: { text: string; author: string }): Promise<DuoSale>;
  /**
   * true si `advisorId` es la asesora de cierre de un caso activo (no
   * cerrado) sobre esta conversación. Usado por conversation-access.ts para
   * darle acceso de lectura/escritura al chat aunque no sea la asesora
   * "titular" (assigned_advisor_id) en lead_conversations.
   */
  isActiveClosingAdvisor(conversationId: string, advisorId: string): Promise<boolean>;
  /**
   * Cierra el caso: crea la venta real atribuida a la asesora de origen (con
   * la mitad de la comisión normal del plan), registra la otra mitad como
   * commission_extras para la asesora de cierre, y marca duo_sales como
   * closed. Todo o nada — si algo falla no debe quedar a medias.
   *
   * SOLO debe llamarse tras verificar que `closingAdvisorId` es realmente
   * la asesora de cierre de un caso en estado "assigned" — el repositorio
   * también lo revalida atómicamente (WHERE status='assigned' AND
   * closing_advisor_id=...) para que dos cierres simultáneos no dupliquen
   * la venta ni la comisión.
   */
  close(id: string, closingAdvisorId: string): Promise<CloseDuoSaleResult>;
}

function newDuoSaleId() {
  return `DUO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function newNoteId() {
  return `dcn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Resuelve el plan por nombre (Operación Duo no usa el selector de catálogo,
 * el plan queda como texto libre) y calcula cuánto le corresponde a CADA
 * asesora: la mitad de la comisión normal del plan, redondeada al peso.
 * womValue/dumoValue de la venta quedan COMPLETOS — lo que paga el cliente y
 * gana la empresa no cambia; solo se divide lo que cobra cada asesora.
 */
async function resolveDuoSaleMoney(planName: string) {
  const config = await getCommercialConfigurationRepository().getSnapshot();
  const q = planName.trim().toLowerCase();
  const plan =
    config.plans.find((p) => p.name.toLowerCase() === q && p.status === "active") ??
    config.plans.find(
      (p) => p.status === "active" && (q.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(q)),
    );
  const commission = findPlanCommission(planName, config.plans);
  const half = Math.round(commission / 2);
  return {
    womValue: plan?.womValue ?? 0,
    dumoValue: plan?.dumoValue ?? 0,
    half,
  };
}

function newSaleLineId(saleId: string) {
  return `${saleId}-L1`;
}

/* ----------------------------- Mock ----------------------------- */

class MockDuoSalesRepository implements DuoSalesRepository {
  private rows: DuoSale[] = [];

  async create(input: CreateDuoSaleInput): Promise<DuoSale> {
    const now = new Date().toISOString();
    const row: DuoSale = {
      ...input,
      id: newDuoSaleId(),
      closingAdvisorId: null,
      closingAdvisorName: null,
      status: "pending_assignment",
      closingNotes: [],
      closedSaleId: null,
      assignedAt: null,
      closedAt: null,
      createdAt: now,
    };
    this.rows.unshift(row);
    return row;
  }

  async listAll() {
    return [...this.rows];
  }

  async listForClosingAdvisor(advisorId: string) {
    return this.rows.filter((r) => r.closingAdvisorId === advisorId);
  }

  async getById(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async assign(id: string, advisor: { id: string; name: string }) {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Venta Duo no encontrada.");
    this.rows[idx] = {
      ...this.rows[idx]!,
      closingAdvisorId: advisor.id,
      closingAdvisorName: advisor.name,
      status: "assigned",
      assignedAt: new Date().toISOString(),
    };
    return this.rows[idx]!;
  }

  async addClosingNote(id: string, note: { text: string; author: string }) {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Venta Duo no encontrada.");
    const entry: DuoClosingNote = {
      id: newNoteId(),
      text: note.text,
      author: note.author,
      createdAt: new Date().toISOString(),
    };
    this.rows[idx] = {
      ...this.rows[idx]!,
      closingNotes: [entry, ...this.rows[idx]!.closingNotes],
    };
    return this.rows[idx]!;
  }

  async isActiveClosingAdvisor(conversationId: string, advisorId: string) {
    return this.rows.some(
      (r) =>
        r.conversationId === conversationId &&
        r.closingAdvisorId === advisorId &&
        r.status !== "closed",
    );
  }

  async close(id: string, closingAdvisorId: string): Promise<CloseDuoSaleResult> {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Venta Duo no encontrada.");
    const current = this.rows[idx]!;
    if (current.status !== "assigned" || current.closingAdvisorId !== closingAdvisorId) {
      throw new Error("Solo la asesora asignada puede cerrar un caso en estado 'assigned'.");
    }
    const { half } = await resolveDuoSaleMoney(current.plan);
    const saleId = `VTA-DUO-MOCK-${Date.now()}`;
    this.rows[idx] = {
      ...current,
      status: "closed",
      closedSaleId: saleId,
      closedAt: new Date().toISOString(),
    };
    return {
      duoSale: this.rows[idx]!,
      saleId,
      originCommission: half,
      closingCommission: half,
    };
  }
}

/* --------------------------- Postgres --------------------------- */

type DuoSaleRow = {
  id: string;
  conversation_id: string;
  gestion_id: string | null;
  customer_name: string;
  rut: string;
  phone: string;
  origin_advisor_id: string;
  origin_advisor_name: string;
  closing_advisor_id: string | null;
  closing_advisor_name: string | null;
  status: DuoSaleStatus;
  current_company: string;
  email: string;
  region: string;
  comuna: string;
  street: string;
  house_number: string;
  plan: string;
  equipment: string;
  sale_type: string;
  dispatch: string;
  dumo_registered_name: string;
  call_time: string;
  comments: string;
  closing_notes: DuoClosingNote[];
  closed_sale_id: string | null;
  assigned_at: string | null;
  closed_at: string | null;
  created_at: string;
};

function mapRow(r: DuoSaleRow): DuoSale {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    gestionId: r.gestion_id,
    customerName: r.customer_name,
    rut: r.rut,
    phone: r.phone,
    originAdvisorId: r.origin_advisor_id,
    originAdvisorName: r.origin_advisor_name,
    closingAdvisorId: r.closing_advisor_id,
    closingAdvisorName: r.closing_advisor_name,
    status: r.status,
    currentCompany: r.current_company,
    email: r.email,
    region: r.region,
    comuna: r.comuna,
    street: r.street,
    houseNumber: r.house_number,
    plan: r.plan,
    equipment: r.equipment,
    saleType: r.sale_type,
    dispatch: r.dispatch,
    dumoRegisteredName: r.dumo_registered_name,
    callTime: r.call_time,
    comments: r.comments,
    closingNotes: Array.isArray(r.closing_notes) ? r.closing_notes : [],
    closedSaleId: r.closed_sale_id,
    assignedAt: r.assigned_at ? new Date(r.assigned_at).toISOString() : null,
    closedAt: r.closed_at ? new Date(r.closed_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

class PostgresDuoSalesRepository implements DuoSalesRepository {
  async create(input: CreateDuoSaleInput): Promise<DuoSale> {
    await ensureSchema();
    const sql = requireSql();
    const id = newDuoSaleId();
    const rows = await withDbRetry(() =>
      sql<DuoSaleRow[]>`
        INSERT INTO duo_sales (
          id, conversation_id, gestion_id, customer_name, rut, phone,
          origin_advisor_id, origin_advisor_name,
          current_company, email, region, comuna, street, house_number,
          plan, equipment, sale_type, dispatch, dumo_registered_name, call_time, comments
        ) VALUES (
          ${id}, ${input.conversationId}, ${input.gestionId}, ${input.customerName}, ${input.rut}, ${input.phone},
          ${input.originAdvisorId}, ${input.originAdvisorName},
          ${input.currentCompany}, ${input.email}, ${input.region}, ${input.comuna}, ${input.street}, ${input.houseNumber},
          ${input.plan}, ${input.equipment}, ${input.saleType}, ${input.dispatch}, ${input.dumoRegisteredName}, ${input.callTime}, ${input.comments}
        )
        RETURNING *
      `,
    );
    return mapRow(rows[0]!);
  }

  async listAll(): Promise<DuoSale[]> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withQueryTimeout(
      withDbRetry(() =>
        sql<DuoSaleRow[]>`
          SELECT * FROM duo_sales
          ORDER BY (status = 'closed'), created_at DESC
        `,
      ),
      8000,
    );
    return rows.map(mapRow);
  }

  async listForClosingAdvisor(advisorId: string): Promise<DuoSale[]> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withQueryTimeout(
      withDbRetry(() =>
        sql<DuoSaleRow[]>`
          SELECT * FROM duo_sales
          WHERE closing_advisor_id = ${advisorId}
          ORDER BY (status = 'closed'), created_at DESC
        `,
      ),
      8000,
    );
    return rows.map(mapRow);
  }

  async getById(id: string): Promise<DuoSale | null> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await sql<DuoSaleRow[]>`SELECT * FROM duo_sales WHERE id = ${id} LIMIT 1`;
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async assign(id: string, advisor: { id: string; name: string }): Promise<DuoSale> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await sql<DuoSaleRow[]>`
      UPDATE duo_sales SET
        closing_advisor_id = ${advisor.id},
        closing_advisor_name = ${advisor.name},
        status = 'assigned',
        assigned_at = now(),
        updated_at = now()
      WHERE id = ${id} AND status <> 'closed'
      RETURNING *
    `;
    if (!rows[0]) throw new Error("Venta Duo no encontrada o ya cerrada.");
    return mapRow(rows[0]);
  }

  async addClosingNote(id: string, note: { text: string; author: string }): Promise<DuoSale> {
    await ensureSchema();
    const sql = requireSql();
    const entry: DuoClosingNote = {
      id: newNoteId(),
      text: note.text,
      author: note.author,
      createdAt: new Date().toISOString(),
    };
    const rows = await sql<DuoSaleRow[]>`
      UPDATE duo_sales SET
        closing_notes = (${JSON.stringify(entry)}::jsonb) || closing_notes,
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!rows[0]) throw new Error("Venta Duo no encontrada.");
    return mapRow(rows[0]);
  }

  async isActiveClosingAdvisor(conversationId: string, advisorId: string): Promise<boolean> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await sql<{ n: number }[]>`
      SELECT 1 AS n FROM duo_sales
      WHERE conversation_id = ${conversationId}
        AND closing_advisor_id = ${advisorId}
        AND status <> 'closed'
      LIMIT 1
    `;
    return rows.length > 0;
  }

  async close(id: string, closingAdvisorId: string): Promise<CloseDuoSaleResult> {
    await ensureSchema();
    const sql = requireSql();

    const result = await sql.begin(async (tx) => {
      // FOR UPDATE: bloquea la fila hasta que termine la transacción, así
      // dos cierres simultáneos del mismo caso no pueden ambos pasar la
      // verificación y duplicar la venta/comisión.
      const rows = await tx<DuoSaleRow[]>`
        SELECT * FROM duo_sales WHERE id = ${id} FOR UPDATE
      `;
      const current = rows[0];
      if (!current) throw new Error("Venta Duo no encontrada.");
      if (current.status !== "assigned" || current.closing_advisor_id !== closingAdvisorId) {
        throw new Error(
          "Solo la asesora asignada puede cerrar un caso en estado 'assigned'.",
        );
      }

      const { womValue, dumoValue, half } = await resolveDuoSaleMoney(current.plan);

      const countRows = await tx`SELECT count(*)::int AS n FROM sales`;
      const seq = (Number(countRows[0]?.n) || 0) + 1;
      const saleId = `VTA-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;
      const nowIso = new Date().toISOString();
      const today = nowIso.slice(0, 10);
      const leadSaleType = (current.sale_type || "portability") as LeadSaleType;
      const equipmentMode = current.equipment.trim() ? "with" : "none";
      const canonicalType = mapLeadLineToSaleType(leadSaleType, equipmentMode);
      const adminType = canonicalToAdminType(canonicalType);

      await tx`
        INSERT INTO sales (
          id, customer_name, rut, phone, email, advisor_id, advisor_name,
          status, sale_type, plan, operator_value, dumo_value, sale_date, notes,
          created_at, commission_override, duo_sale_id
        ) VALUES (
          ${saleId}, ${current.customer_name}, ${current.rut}, ${current.phone},
          ${current.email}, ${current.origin_advisor_id}, ${current.origin_advisor_name},
          ${"registrada"}, ${adminType}, ${current.plan}, ${womValue}, ${dumoValue},
          ${today}, ${"Operación Duo — cerrada por " + current.closing_advisor_name},
          ${nowIso}, ${half}, ${id}
        )
      `;

      await tx`
        INSERT INTO sale_lines (
          id, sale_id, phone_number, sale_type, device_name, plan_id, status
        ) VALUES (
          ${newSaleLineId(saleId)}, ${saleId}, ${current.phone}, ${adminType},
          ${current.equipment}, ${""}, ${"registrada"}
        )
      `;

      const extraId = `CX-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await tx`
        INSERT INTO commission_extras (
          id, advisor_id, advisor_name, label, amount, duo_sale_id, sale_id, customer_name
        ) VALUES (
          ${extraId}, ${closingAdvisorId}, ${current.closing_advisor_name},
          ${"Operación Duo - Cierre de venta"}, ${half}, ${id}, ${saleId}, ${current.customer_name}
        )
      `;

      const updated = await tx<DuoSaleRow[]>`
        UPDATE duo_sales SET
          status = 'closed',
          closed_sale_id = ${saleId},
          closed_at = now(),
          updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `;

      return {
        duoSale: mapRow(updated[0]!),
        saleId,
        originCommission: half,
        closingCommission: half,
      };
    });

    return result;
  }
}

export function getDuoSalesRepository(): DuoSalesRepository {
  return hasDatabase() ? new PostgresDuoSalesRepository() : new MockDuoSalesRepository();
}
