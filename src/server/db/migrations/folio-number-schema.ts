import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const FOLIO_NUMBER_REQUIRED_COLUMNS = [
  "lead_gestiones.folio_number",
  "sales.folio_number",
  "duo_sales.folio_number",
] as const;

/**
 * Número de folio (radicado) que la asesora escribe manualmente. Opcional en
 * cualquier gestión; obligatorio y único en todo el sistema cuando la
 * gestión es venta u Operación Duo (validado en la capa de servicio/ruta,
 * no aquí). `folio_numbers` es el registro atómico que garantiza esa
 * unicidad entre `sales` y `duo_sales` — dos tablas distintas no pueden
 * compartir un unique constraint de Postgres directamente.
 */
export async function runFolioNumberMigrations(tx: MigrationSql): Promise<void> {
  await tx`ALTER TABLE lead_gestiones ADD COLUMN IF NOT EXISTS folio_number text NOT NULL DEFAULT ''`;
  await tx`ALTER TABLE sales ADD COLUMN IF NOT EXISTS folio_number text NOT NULL DEFAULT ''`;
  await tx`ALTER TABLE duo_sales ADD COLUMN IF NOT EXISTS folio_number text NOT NULL DEFAULT ''`;

  await tx`
    CREATE TABLE IF NOT EXISTS folio_numbers (
      folio_number text PRIMARY KEY,
      sale_id text,
      duo_sale_id text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}
