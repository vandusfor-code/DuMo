import "server-only";
import { ensureSchema, getSql, hasDatabase, withDbRetry } from "@/server/db/client";

export interface FolioNumberRepository {
  /** true si ya existe una venta u Operación Duo con este folio. */
  exists(folioNumber: string): Promise<boolean>;
}

class MockFolioNumberRepository implements FolioNumberRepository {
  async exists(): Promise<boolean> {
    return false;
  }
}

class PostgresFolioNumberRepository implements FolioNumberRepository {
  async exists(folioNumber: string): Promise<boolean> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return false;
    const rows = await withDbRetry(() =>
      sql<{ n: number }[]>`SELECT 1 AS n FROM folio_numbers WHERE folio_number = ${folioNumber} LIMIT 1`,
    );
    return rows.length > 0;
  }
}

export function getFolioNumberRepository(): FolioNumberRepository {
  return hasDatabase() ? new PostgresFolioNumberRepository() : new MockFolioNumberRepository();
}
