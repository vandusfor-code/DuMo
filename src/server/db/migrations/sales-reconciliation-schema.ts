import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const SALES_RECONCILIATION_REQUIRED_COLUMNS = [
  "gestion_reconciliation.gestion_id",
] as const;

/**
 * P0 (histórico) — cola de revisión para las gestiones "venta" que quedaron
 * huérfanas por el bug de saveAction (antes de este fix, 24 casos reales).
 * No se reconstruyen solas: el admin decide una por una, por eso se guarda
 * el veredicto (registrada / descartada) en vez de solo re-derivar el
 * estado "sin venta" cada vez — así una gestión descartada (dato de prueba)
 * no vuelve a aparecer en la lista.
 */
export async function runSalesReconciliationMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    CREATE TABLE IF NOT EXISTS gestion_reconciliation (
      gestion_id text PRIMARY KEY,
      status text NOT NULL,
      resolved_sale_id text,
      resolved_by text NOT NULL DEFAULT '',
      resolved_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await tx`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'gestion_reconciliation_status_check'
      ) THEN
        ALTER TABLE gestion_reconciliation ADD CONSTRAINT gestion_reconciliation_status_check
          CHECK (status IN ('registered', 'dismissed'));
      END IF;
    END $$
  `;
}
