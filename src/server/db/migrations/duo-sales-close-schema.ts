import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const DUO_SALES_CLOSE_REQUIRED_COLUMNS = [
  "sales.commission_override",
  "sales.duo_sale_id",
  "commission_extras.customer_name",
] as const;

/**
 * DUO-4 — columnas para el cierre de Operación Duo.
 *
 * `sales.commission_override`: cuando no es NULL, listAdvisorCommissions()
 * usa este valor en vez de perLine(plan) * lines. Solo se escribe en ventas
 * de Operación Duo (para que la comisión de la asesora de origen quede en
 * la mitad); en cualquier venta normal queda NULL y el cálculo no cambia
 * ni un centavo — aísla el caso especial sin tocar la fórmula general.
 *
 * `sales.duo_sale_id`: referencia de vuelta a duo_sales — de aquí sale el
 * badge "Operación Duo" en ventas/contabilidad (DUO-5) sin tabla extra.
 *
 * `commission_extras.customer_name`: denormalizado al escribir para que la
 * pantalla de comisiones de la asesora de cierre no necesite un join.
 */
export async function runDuoSalesCloseMigrations(tx: MigrationSql): Promise<void> {
  await tx`ALTER TABLE sales ADD COLUMN IF NOT EXISTS commission_override numeric`;
  await tx`ALTER TABLE sales ADD COLUMN IF NOT EXISTS duo_sale_id text`;
  await tx`ALTER TABLE commission_extras ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT ''`;
  await tx`CREATE INDEX IF NOT EXISTS idx_sales_duo_sale_id ON sales (duo_sale_id) WHERE duo_sale_id IS NOT NULL`;
}
