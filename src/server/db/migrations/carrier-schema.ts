import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const CARRIER_REQUIRED_COLUMNS = [
  "tipifications.carrier",
  "lead_conversations.carrier",
  "lead_gestiones.carrier",
  "sales.carrier",
  "connected_numbers.carrier",
  "whatsapp_channels.carrier",
] as const;

/**
 * Soporte multi-operador (WOM + Claro, mismo CRM). `carrier` es una
 * dimensión NUEVA y aislada — no reutiliza company_id, que ya significa
 * "empresa/tenant" y está referenciado en decenas de queries de auth,
 * ventas, comisiones y contabilidad. Todo dato existente queda 'wom' por
 * default, sin tocar nada de lo que ya funciona.
 *
 * - tipifications/connected_numbers/whatsapp_channels: a qué operador
 *   pertenece el catálogo o la línea conectada.
 * - lead_conversations: operador detectado automáticamente al llegar el
 *   primer mensaje (por el número de entrada).
 * - lead_gestiones/sales: operador elegido a mano al tipificar/vender —
 *   puede diferir del de la conversación (cliente llega por el número WOM,
 *   la asesora valida que aplica para Claro y lo vende como Claro).
 */
export async function runCarrierMigrations(tx: MigrationSql): Promise<void> {
  await tx`ALTER TABLE tipifications ADD COLUMN IF NOT EXISTS carrier text NOT NULL DEFAULT 'wom'`;
  await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS carrier text NOT NULL DEFAULT 'wom'`;
  await tx`ALTER TABLE lead_gestiones ADD COLUMN IF NOT EXISTS carrier text`;
  await tx`ALTER TABLE sales ADD COLUMN IF NOT EXISTS carrier text NOT NULL DEFAULT 'wom'`;
  await tx`ALTER TABLE connected_numbers ADD COLUMN IF NOT EXISTS carrier text NOT NULL DEFAULT 'wom'`;
  await tx`ALTER TABLE whatsapp_channels ADD COLUMN IF NOT EXISTS carrier text NOT NULL DEFAULT 'wom'`;

  const checks: [string, string][] = [
    ["tipifications_carrier_check", "tipifications"],
    ["lead_conversations_carrier_check", "lead_conversations"],
    ["sales_carrier_check", "sales"],
    ["connected_numbers_carrier_check", "connected_numbers"],
    ["whatsapp_channels_carrier_check", "whatsapp_channels"],
  ];
  for (const [constraintName, table] of checks) {
    await tx.unsafe(`
      DO $$ BEGIN
        ALTER TABLE ${table} ADD CONSTRAINT ${constraintName}
          CHECK (carrier IN ('wom', 'claro'));
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }
  // lead_gestiones.carrier es nullable (gestiones viejas no tienen valor) —
  // constraint separado que permite NULL además de los dos valores válidos.
  await tx.unsafe(`
    DO $$ BEGIN
      ALTER TABLE lead_gestiones ADD CONSTRAINT lead_gestiones_carrier_check
        CHECK (carrier IS NULL OR carrier IN ('wom', 'claro'));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
}
