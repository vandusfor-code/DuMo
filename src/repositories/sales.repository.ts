import "server-only";
import type { SaleStatus } from "@/types/common";
import type {
  NewSaleInput,
  SaleDetail,
  SaleHistoryEvent,
  SaleLine,
  SaleSummary,
} from "@/types/sale";
import {
  SALES_SUMMARY_MOCK,
  SALE_DETAILS_MOCK,
  buildFallbackDetail,
} from "@/data/mock/sales.mock";
import { withLatency } from "@/lib/mock";
import { businessDateISO } from "@/lib/date";
import { CONFIG_KEYS } from "@/server/google/schema";
import { toInt, toSaleStatus, toSaleType } from "@/server/google/parse";
import { getSheetsClient, type GoogleSheetsClient } from "@/server/google/sheets-client";

import type { AdvisorScope } from "@/lib/advisor-scope";

export interface SalesRepository {
  list(scope?: AdvisorScope | null): Promise<SaleSummary[]>;
  getById(id: string): Promise<SaleDetail | null>;
  create(input: NewSaleInput, scope?: AdvisorScope | null): Promise<SaleDetail>;
  delete(id: string, scope?: AdvisorScope | null): Promise<void>;
}

/* ----------------------------- Mock ----------------------------- */

class MockSalesRepository implements SalesRepository {
  list() {
    return withLatency(SALES_SUMMARY_MOCK);
  }
  getById(id: string) {
    const detail =
      SALE_DETAILS_MOCK[id] ??
      (() => {
        const summary = SALES_SUMMARY_MOCK.find((s) => s.id === id);
        return summary ? buildFallbackDetail(summary) : null;
      })();
    return withLatency(detail);
  }
  create(input: NewSaleInput) {
    const id = `VTA-2025-${String(
      SALES_SUMMARY_MOCK.length + 1,
    ).padStart(5, "0")}`;
    const detail: SaleDetail = {
      id,
      customer: {
        name: input.customerName,
        rut: input.rut,
        phone: input.phone,
        email: input.email ?? "",
      },
      advisor: "María López",
      status: "pending",
      createdAt: businessDateISO(),
      notes: input.notes ?? "",
      folioNumber: input.folioNumber ?? "",
      lines: input.lines.map((l) => ({
        phoneNumber: l.phoneNumber,
        saleType: l.saleType,
        deviceName: l.deviceName,
        status: "pending",
      })),
      history: [
        {
          title: "Venta creada",
          user: "María López",
          datetime: new Date().toISOString(),
        },
      ],
    };
    return withLatency(detail);
  }
  delete(_id: string) {
    return Promise.resolve();
  }
}

/* --------------------------- Sheets ----------------------------- */

class SheetsSalesRepository implements SalesRepository {
  constructor(private readonly client: GoogleSheetsClient) {}

  async list(): Promise<SaleSummary[]> {
    const [ventas, lineas] = await Promise.all([
      this.client.getRecords("Ventas"),
      this.client.getRecords("LineasVenta"),
    ]);

    const lineCount = new Map<string, number>();
    for (const l of lineas) {
      lineCount.set(l.ventaId, (lineCount.get(l.ventaId) ?? 0) + 1);
    }

    return ventas
      .map<SaleSummary>((v) => ({
        id: v.id,
        customerName: v.cliente,
        rut: v.rut,
        date: v.fecha,
        lines: lineCount.get(v.id) ?? toInt(v.lineas),
        status: toSaleStatus(v.estado),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async getById(id: string): Promise<SaleDetail | null> {
    const [ventas, lineas, logs] = await Promise.all([
      this.client.getRecords("Ventas"),
      this.client.getRecords("LineasVenta"),
      this.client.getRecords("Logs"),
    ]);

    const venta = ventas.find((v) => v.id === id);
    if (!venta) return null;

    const lines: SaleLine[] = lineas
      .filter((l) => l.ventaId === id)
      .map((l) => ({
        phoneNumber: l.numeroLinea,
        saleType: toSaleType(l.tipoVenta),
        deviceName: l.equipo || undefined,
        status: toSaleStatus(l.estado),
      }));

    const history: SaleHistoryEvent[] = logs
      .filter((log) => log.contexto?.includes(id))
      .map((log) => ({
        title: log.mensaje,
        user: this.safeUser(log.contexto),
        datetime: log.fecha,
      }))
      .sort((a, b) => a.datetime.localeCompare(b.datetime));

    return {
      id: venta.id,
      customer: {
        name: venta.cliente,
        rut: venta.rut,
        phone: venta.telefono,
        email: venta.email,
      },
      advisor: venta.asesora,
      status: toSaleStatus(venta.estado),
      createdAt: venta.fecha,
      notes: venta.notas ?? "",
      lines,
      history,
    };
  }

  async create(input: NewSaleInput): Promise<SaleDetail> {
    const ventas = await this.client.getRecords("Ventas");
    const year = new Date().getFullYear();
    const id = `VTA-${year}-${String(ventas.length + 1).padStart(5, "0")}`;
    const nowIso = new Date().toISOString();
    const today = businessDateISO();
    const advisor = "María López";
    const status: SaleStatus = "pending";

    // 1) Ventas row
    await this.client.appendRecord("Ventas", {
      id,
      cliente: input.customerName,
      rut: input.rut,
      telefono: input.phone,
      email: input.email ?? "",
      asesora: advisor,
      estado: status,
      fecha: today,
      plan: "",
      notas: input.notes ?? "",
      creadoEn: nowIso,
    });

    // 2) LineasVenta rows
    await this.client.appendRecords(
      "LineasVenta",
      input.lines.map((l, i) => ({
        id: `${id}-L${i + 1}`,
        ventaId: id,
        numeroLinea: l.phoneNumber,
        tipoVenta: l.saleType,
        equipo: l.deviceName ?? "",
        estado: status,
      })),
    );

    // 3) Auto-generate a pending commission for the sale.
    const config = await this.client.getConfigMap();
    const perLine = toInt(config[CONFIG_KEYS.commissionPerLine]) || 65000;
    await this.client.appendRecord("Comisiones", {
      id: `COM-${id.replace("VTA-", "")}`,
      ventaId: id,
      cliente: input.customerName,
      fecha: today,
      lineas: String(input.lines.length),
      monto: String(perLine * input.lines.length),
      estado: "pending",
      fechaPago: "",
    });

    // 4) History log
    await this.client.log("info", "Venta creada", { ventaId: id, user: advisor });

    return {
      id,
      customer: {
        name: input.customerName,
        rut: input.rut,
        phone: input.phone,
        email: input.email ?? "",
      },
      advisor,
      status,
      createdAt: today,
      notes: input.notes ?? "",
      lines: input.lines.map((l) => ({
        phoneNumber: l.phoneNumber,
        saleType: l.saleType,
        deviceName: l.deviceName,
        status,
      })),
      history: [{ title: "Venta creada", user: advisor, datetime: nowIso }],
    };
  }

  delete(_id: string) {
    return Promise.resolve();
  }

  private safeUser(contexto: string | undefined): string {
    try {
      const parsed = JSON.parse(contexto ?? "{}");
      return typeof parsed.user === "string" ? parsed.user : "Sistema";
    } catch {
      return "Sistema";
    }
  }
}

import { getPostgresSalesStore } from "@/repositories/postgres-sales.repository";
import { hasDatabase } from "@/server/db/client";

export function getSalesRepository(): SalesRepository {
  if (hasDatabase()) {
    const store = getPostgresSalesStore();
    return {
      list: (scope) => store.listSummaries(scope ?? null),
      getById: (id) => store.getSaleDetail(id),
      create: (input, scope) => store.createSale(input, scope ?? null),
      delete: (id, scope) => store.deleteSale(id, scope ?? null),
    };
  }
  return new MockSalesRepository();
}
