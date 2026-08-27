import "server-only";
import * as XLSX from "xlsx";
import { ensureSchema, getSql, withDbRetry } from "@/server/db/client";
import { formatWhatsAppDisplayPhone } from "@/lib/whatsapp/phone";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";

const LEADS_EXPORT_SHEET = "Leads";

export interface LeadsExportRow {
  customer_name: string | null;
  rut: string | null;
  phone: string | null;
  last_message_at: Date | null;
  tipification_name: string | null;
}

/**
 * Exporta leads por rango de fecha de último mensaje. Alimenta directamente
 * al importador de Campañas — mismas columnas Nombre/Teléfono que ya detecta
 * el mapeo de columnas.
 */
export const leadsExportService = {
  async buildWorkbookBuffer(input: { from: string; to: string }): Promise<Buffer> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new Error("Base de datos no configurada.");

    const rows = await withDbRetry(() =>
      sql<LeadsExportRow[]>`
        SELECT
          c.customer_name, c.rut, c.phone, c.last_message_at,
          t.name AS tipification_name
        FROM lead_conversations c
        LEFT JOIN LATERAL (
          SELECT gestion_type
          FROM lead_gestiones
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) lg ON true
        LEFT JOIN tipifications t
          ON t.slug = COALESCE(NULLIF(c.current_tipification_slug, ''), lg.gestion_type)
          AND t.company_id = ${DEFAULT_COMPANY_ID}
        WHERE c.last_message_at >= ${input.from}::date
          AND c.last_message_at < (${input.to}::date + interval '1 day')
        ORDER BY c.last_message_at DESC
      `,
    );

    const sheet = XLSX.utils.aoa_to_sheet([
      ["Nombre", "Teléfono", "RUT", "Última tipificación", "Fecha último mensaje"],
      ...rows.map((r) => [
        r.customer_name ?? "",
        r.phone ? formatWhatsAppDisplayPhone(r.phone) : "",
        r.rut ?? "",
        r.tipification_name ?? "",
        r.last_message_at ? new Date(r.last_message_at).toLocaleString("es-CL") : "",
      ]),
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, LEADS_EXPORT_SHEET);
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  },
};
