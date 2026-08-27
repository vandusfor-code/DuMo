import "server-only";
import { ensureSchema, getSql, withDbRetry, withQueryTimeout } from "@/server/db/client";
import type {
  PcsValidationEstado,
  PcsValidationJob,
  PcsValidationJobStatus,
  PcsValidationResultRow,
} from "@/types/pcs-validation";

export interface PcsValidationRepository {
  hasActiveJob(userId: string): Promise<boolean>;
  createJob(input: { id: string; userId: string; total: number }): Promise<void>;
  markProcessing(jobId: string): Promise<void>;
  insertResults(
    jobId: string,
    rows: { id: string; pcs: string; nombre: string | null; estado: PcsValidationEstado }[],
  ): Promise<void>;
  incrementProcesados(jobId: string, count: number): Promise<void>;
  markDone(jobId: string): Promise<void>;
  markError(jobId: string, error: string): Promise<void>;
  getJob(jobId: string): Promise<PcsValidationJob | null>;
  getResults(jobId: string): Promise<PcsValidationResultRow[]>;
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

function mapJobRow(row: Record<string, unknown>): PcsValidationJob {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    status: row.status as PcsValidationJobStatus,
    total: Number(row.total ?? 0),
    procesados: Number(row.procesados ?? 0),
    error: (row.error as string | null) ?? null,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(String(row.created_at)).toISOString(),
    finishedAt: row.finished_at
      ? row.finished_at instanceof Date
        ? row.finished_at.toISOString()
        : new Date(String(row.finished_at)).toISOString()
      : null,
  };
}

class PostgresPcsValidationRepository implements PcsValidationRepository {
  async hasActiveJob(userId: string): Promise<boolean> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withQueryTimeout(
      sql<{ id: string }[]>`
        SELECT id FROM pcs_validation_jobs
        WHERE user_id = ${userId} AND status IN ('pending', 'processing')
        LIMIT 1
      `,
      5_000,
    );
    return rows.length > 0;
  }

  async createJob(input: { id: string; userId: string; total: number }): Promise<void> {
    await ensureSchema();
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        INSERT INTO pcs_validation_jobs (id, user_id, status, total, procesados)
        VALUES (${input.id}, ${input.userId}, 'pending', ${input.total}, 0)
      `,
    );
  }

  async markProcessing(jobId: string): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() =>
      sql`UPDATE pcs_validation_jobs SET status = 'processing' WHERE id = ${jobId}`,
    );
  }

  async insertResults(
    jobId: string,
    rows: { id: string; pcs: string; nombre: string | null; estado: PcsValidationEstado }[],
  ): Promise<void> {
    if (rows.length === 0) return;
    const sql = requireSql();
    const values = rows.map((r) => ({
      id: r.id,
      job_id: jobId,
      pcs: r.pcs,
      nombre: r.nombre,
      estado: r.estado,
    }));
    await withDbRetry(() => sql`INSERT INTO pcs_validation_results ${sql(values)}`);
  }

  async incrementProcesados(jobId: string, count: number): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE pcs_validation_jobs SET procesados = procesados + ${count} WHERE id = ${jobId}
      `,
    );
  }

  async markDone(jobId: string): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE pcs_validation_jobs SET status = 'done', finished_at = now() WHERE id = ${jobId}
      `,
    );
  }

  async markError(jobId: string, error: string): Promise<void> {
    const sql = requireSql();
    await withDbRetry(() =>
      sql`
        UPDATE pcs_validation_jobs
        SET status = 'error', error = ${error}, finished_at = now()
        WHERE id = ${jobId}
      `,
    );
  }

  async getJob(jobId: string): Promise<PcsValidationJob | null> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withQueryTimeout(
      sql`SELECT * FROM pcs_validation_jobs WHERE id = ${jobId} LIMIT 1`,
      5_000,
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    return row ? mapJobRow(row) : null;
  }

  async getResults(jobId: string): Promise<PcsValidationResultRow[]> {
    const sql = requireSql();
    const rows = await withQueryTimeout(
      sql<{ pcs: string; nombre: string | null; estado: PcsValidationEstado }[]>`
        SELECT pcs, nombre, estado FROM pcs_validation_results
        WHERE job_id = ${jobId}
        ORDER BY created_at ASC
      `,
      8_000,
    );
    return rows;
  }
}

let singleton: PcsValidationRepository | null = null;

export function getPcsValidationRepository(): PcsValidationRepository {
  if (!singleton) singleton = new PostgresPcsValidationRepository();
  return singleton;
}
