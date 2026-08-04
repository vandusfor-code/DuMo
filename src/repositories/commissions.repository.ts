import "server-only";
import type { Commission } from "@/types/commission";
import { COMMISSIONS_MOCK } from "@/data/mock/commissions.mock";
import { withLatency } from "@/lib/mock";
import { toCommissionStatus, toInt } from "@/server/google/parse";
import { getSheetsClient, type GoogleSheetsClient } from "@/server/google/sheets-client";

export interface CommissionsRepository {
  /** All commissions, optionally filtered to a month (yyyy-mm). */
  list(month?: string): Promise<Commission[]>;
}

function inMonth(date: string, month?: string): boolean {
  if (!month) return true;
  return date.startsWith(month);
}

class MockCommissionsRepository implements CommissionsRepository {
  list(month?: string) {
    return withLatency(COMMISSIONS_MOCK.filter((c) => inMonth(c.date, month)));
  }
}

class SheetsCommissionsRepository implements CommissionsRepository {
  constructor(private readonly client: GoogleSheetsClient) {}

  async list(month?: string): Promise<Commission[]> {
    const records = await this.client.getRecords("Comisiones");
    return records
      .map<Commission>((r) => ({
        id: r.id,
        saleId: r.ventaId,
        customerName: r.cliente,
        date: r.fecha,
        lines: toInt(r.lineas),
        amount: toInt(r.monto),
        status: toCommissionStatus(r.estado),
        paymentDate: r.fechaPago ? r.fechaPago : null,
      }))
      .filter((c) => inMonth(c.date, month))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
}

export function getCommissionsRepository(): CommissionsRepository {
  const client = getSheetsClient();
  return client
    ? new SheetsCommissionsRepository(client)
    : new MockCommissionsRepository();
}
