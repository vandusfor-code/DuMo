import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const PCS_VALIDATION_REQUIRED_COLUMNS = [
  "pcs_validation_jobs.status",
  "pcs_validation_results.estado",
] as const;

/**
 * Validación PCS — sube un Excel de números, valida cuáles tienen WhatsApp
 * activo usando el bridge de Baileys ya conectado, y entrega el resultado
 * para pegar en Dulabs o descargar filtrado. `pcs_validation_jobs` es UNA
 * fila por corrida; `pcs_validation_results` es el detalle por número.
 */
export async function runPcsValidationMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    CREATE TABLE IF NOT EXISTS pcs_validation_jobs (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id),
      status text NOT NULL DEFAULT 'pending',
      total integer NOT NULL,
      procesados integer NOT NULL DEFAULT 0,
      error text,
      created_at timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz
    )
  `;

  await tx`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pcs_validation_jobs_status_check'
      ) THEN
        ALTER TABLE pcs_validation_jobs ADD CONSTRAINT pcs_validation_jobs_status_check
          CHECK (status IN ('pending', 'processing', 'done', 'error'));
      END IF;
    END $$
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS pcs_validation_results (
      id text PRIMARY KEY,
      job_id text NOT NULL REFERENCES pcs_validation_jobs(id) ON DELETE CASCADE,
      pcs text NOT NULL,
      nombre text,
      estado text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await tx`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pcs_validation_results_estado_check'
      ) THEN
        ALTER TABLE pcs_validation_results ADD CONSTRAINT pcs_validation_results_estado_check
          CHECK (estado IN ('valido', 'no_valido', 'invalido', 'error'));
      END IF;
    END $$
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_pcs_validation_results_job_id
    ON pcs_validation_results (job_id)
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_pcs_validation_jobs_user_status
    ON pcs_validation_jobs (user_id, status)
    WHERE status IN ('pending', 'processing')
  `;
}
