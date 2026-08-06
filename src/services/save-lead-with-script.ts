import "server-only";
import { getLeadRepository } from "@/repositories/leads.repository";
import { salesScriptService } from "@/services/sales-script.service";
import type { SaveLeadInput } from "@/types/lead";
import type { SaveLeadResult } from "@/types/sales-script";

export async function saveLeadWithScript(
  input: SaveLeadInput,
  advisor?: { name: string; email: string },
): Promise<SaveLeadResult> {
  const lead = await getLeadRepository().saveLead(input);
  let script = null;
  if (input.type === "venta" && input.lines.length > 0) {
    script = await salesScriptService.generateAndSave({
      gestionId: lead.id,
      gestion: input,
      advisor,
    });
  }
  return { lead, script };
}
