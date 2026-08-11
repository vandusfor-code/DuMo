import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const DUO_SALES_REQUIRED_COLUMNS = [
  "duo_sales.closing_advisor_id",
  "duo_sales.status",
  "commission_extras.advisor_id",
] as const;

/**
 * DUO-1 — módulo "Ventas por cerrar" (Operación Duo).
 *
 * `duo_sales`: cola paralela a las ventas normales. Una fila = un caso
 * concretado por chat que espera que otra asesora lo cierre por llamada.
 * No se relaciona con `sales` hasta el cierre (DUO-4), donde `closed_sale_id`
 * queda apuntando a la fila real creada en ese momento.
 *
 * `commission_extras`: entradas de comisión que NO están ligadas 1:1 a una
 * fila de `sales` (la asesora de cierre cobra sin que se le sume una venta
 * a su contador). Tabla nueva y ligera — aísla el caso especial sin tocar
 * `commission_payments` (que es un agregado por asesora/mes) ni el cálculo
 * estándar de comisiones, que sigue derivándose 100% de `sales`.
 */
export async function runDuoSalesMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    CREATE TABLE IF NOT EXISTS duo_sales (
      id text PRIMARY KEY,
      conversation_id text NOT NULL,
      gestion_id text,
      customer_name text NOT NULL DEFAULT '',
      rut text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '',
      origin_advisor_id text NOT NULL,
      origin_advisor_name text NOT NULL DEFAULT '',
      closing_advisor_id text,
      closing_advisor_name text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'pending_assignment',
      current_company text NOT NULL DEFAULT '',
      email text NOT NULL DEFAULT '',
      region text NOT NULL DEFAULT '',
      comuna text NOT NULL DEFAULT '',
      street text NOT NULL DEFAULT '',
      house_number text NOT NULL DEFAULT '',
      plan text NOT NULL DEFAULT '',
      equipment text NOT NULL DEFAULT '',
      sale_type text NOT NULL DEFAULT '',
      dispatch text NOT NULL DEFAULT '',
      dumo_registered_name text NOT NULL DEFAULT '',
      call_time text NOT NULL DEFAULT '',
      comments text NOT NULL DEFAULT '',
      closing_notes jsonb NOT NULL DEFAULT '[]',
      closed_sale_id text,
      assigned_at timestamptz,
      closed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await tx`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'duo_sales_status_check'
      ) THEN
        ALTER TABLE duo_sales ADD CONSTRAINT duo_sales_status_check
          CHECK (status IN ('pending_assignment', 'assigned', 'closed'));
      END IF;
    END $$
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_duo_sales_status
    ON duo_sales (status, created_at DESC)
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_duo_sales_closing_advisor
    ON duo_sales (closing_advisor_id, status)
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_duo_sales_conversation
    ON duo_sales (conversation_id)
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS commission_extras (
      id text PRIMARY KEY,
      advisor_id text NOT NULL,
      advisor_name text NOT NULL DEFAULT '',
      label text NOT NULL,
      amount numeric NOT NULL DEFAULT 0,
      duo_sale_id text,
      sale_id text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_commission_extras_advisor
    ON commission_extras (advisor_id, created_at DESC)
  `;
}
