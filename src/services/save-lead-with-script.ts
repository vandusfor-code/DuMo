import "server-only";
import { getLeadRepository } from "@/repositories/leads.repository";
import { salesScriptService } from "@/services/sales-script.service";
import { getScriptUnavailableReason } from "@/lib/sales-script/eligibility";
import type { SaveLeadInput } from "@/types/lead";
import type { SaveLeadResult } from "@/types/sales-script";

export async function saveLeadWithScript(
  input: SaveLeadInput,
  advisor?: { name: string; email: string },
): Promise<SaveLeadResult> {
  const lead = await getLeadRepository().saveLead(input);
  let script = null;
  let scriptUnavailableReason: string | null = null;

  if (input.type === "venta" && input.lines.length > 0) {
    scriptUnavailableReason = getScriptUnavailableReason(input);
    if (!scriptUnavailableReason) {
      try {
        script = await salesScriptService.generateAndSave({
          gestionId: lead.id,
          gestion: input,
          advisor,
        });
        if (!script) {
          scriptUnavailableReason =
            "No se pudo generar el script con los datos guardados. Revisa la gestión e intenta de nuevo.";
        }
      } catch (error) {
        console.error("[saveLeadWithScript] script generation failed", error);
        scriptUnavailableReason =
          "Ocurrió un error al generar el script. La gestión se guardó correctamente.";
      }
    }
  }

  return {
    lead,
    script,
    scriptUnavailableReason: script ? null : scriptUnavailableReason,
  };
}
