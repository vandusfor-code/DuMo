import "server-only";
import type { AdvisorScope } from "@/lib/advisor-scope";
import { leadGestionToNewSaleInput } from "@/lib/lead-save";
import { getLeadRepository } from "@/repositories/leads.repository";
import { salesScriptService } from "@/services/sales-script.service";
import { salesService } from "@/services/sales.service";
import { crmClientsService } from "@/services/crm-clients.service";
import type { SaveLeadAction } from "@/types/crm-client";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import { equipmentService } from "@/services/equipment.service";
import { getScriptUnavailableReason, isScriptEligible } from "@/lib/sales-script/eligibility";
import { getScriptBuildError } from "@/lib/sales-script/builder";
import { getDeliveryConfigurationRepository } from "@/repositories/delivery-configuration.repository";
import type { SaveLeadInput } from "@/types/lead";
import type { SaveLeadResult } from "@/types/sales-script";

const SCRIPT_DEBUG = "[script-debug]";

function logScriptSaveCheckpoint(label: string, payload: Record<string, unknown>) {
  console.log(`${SCRIPT_DEBUG} ${label}`, JSON.stringify(payload, null, 2));
}

export async function saveLeadWithScript(
  input: SaveLeadInput,
  scope?: AdvisorScope | null,
): Promise<SaveLeadResult> {
  const lead = await getLeadRepository().saveLead(input);
  const advisor = scope ? { name: scope.name, email: "" } : undefined;
  let script = null;
  let scriptUnavailableReason: string | null = null;
  let sale = null;
  let saleError: string | null = null;

  const saveAction: SaveLeadAction =
    input.saveAction ?? (input.registerSale ? "sale" : "script");
  const shouldGenerateScript =
    saveAction !== "tipify" && input.type === "venta" && input.lines.length > 0;
  const shouldRegisterSale = saveAction === "sale" && input.type === "venta" && input.lines.length > 0;

  if (shouldGenerateScript) {
    const main = input.lines[0];
    const unavailableReason = getScriptUnavailableReason(input);
    const eligible = isScriptEligible(input);

    logScriptSaveCheckpoint("saveLeadWithScript · entrada", {
      conversationId: input.conversationId,
      gestionId: lead.id,
      saleType: main.saleType,
      equipmentMode: main.equipmentMode ?? null,
      equipmentCatalogId: main.equipmentCatalogId ?? null,
      getScriptUnavailableReason: unavailableReason,
      isScriptEligible: eligible,
      buildSalesScriptWillRun: unavailableReason === null,
    });

    scriptUnavailableReason = unavailableReason;
    if (!scriptUnavailableReason) {
      logScriptSaveCheckpoint("saveLeadWithScript · llamando generateAndSave", {
        gestionId: lead.id,
      });
      try {
        script = await salesScriptService.generateAndSave({
          gestionId: lead.id,
          gestion: input,
          advisor,
        });
        if (!script) {
          const [commercialConfig, deliveryConfig, equipmentCatalog] = await Promise.all([
            getCommercialConfigurationRepository().getSnapshot(),
            getDeliveryConfigurationRepository().getConfig(),
            equipmentService.listAll(),
          ]);
          scriptUnavailableReason = getScriptBuildError({
            gestion: input,
            commercialPlans: commercialConfig.plans,
            equipmentCatalog,
            deliveryConfig,
          });
          logScriptSaveCheckpoint("saveLeadWithScript · buildSalesScript devolvió null", {
            getScriptBuildError: scriptUnavailableReason,
          });
        } else {
          logScriptSaveCheckpoint("saveLeadWithScript · script generado", {
            scriptId: script.id,
            flowKey: script.flowKey,
            flowTitle: script.flowTitle,
            stepsCount: script.steps.length,
          });
        }
      } catch (error) {
        console.error("[saveLeadWithScript] script generation failed", error);
        scriptUnavailableReason =
          "Ocurrió un error al generar el script. La gestión se guardó correctamente.";
        logScriptSaveCheckpoint("saveLeadWithScript · excepción", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      logScriptSaveCheckpoint("saveLeadWithScript · detenido por elegibilidad", {
        scriptUnavailableReason,
      });
    }
  }

  if (shouldRegisterSale && scope) {
    const saleInput = leadGestionToNewSaleInput(input);
    if (saleInput) {
      try {
        sale = await salesService.create(saleInput, scope);
      } catch (error) {
        console.error("[saveLeadWithScript] sale registration failed", error);
        saleError = "La gestión se guardó, pero no se pudo registrar en Mis Ventas.";
      }
    }
  }

  if (scope) {
    try {
      await crmClientsService.upsertFromGestion({
        conversationId: input.conversationId,
        customerName: input.customerName,
        rut: input.rut,
        phone: input.phone,
        gestionType: input.type,
        advisorId: scope.id,
        advisorName: scope.name,
        hasSale: Boolean(sale),
      });
    } catch (error) {
      console.error("[saveLeadWithScript] crm client upsert failed", error);
    }
  }

  const result: SaveLeadResult = {
    lead,
    script,
    scriptUnavailableReason: script ? null : scriptUnavailableReason,
    sale,
    saleError,
    saveAction,
  };

  logScriptSaveCheckpoint("saveLeadWithScript · antes de responder", {
    script: result.script ? "SI" : "NO",
    scriptUnavailableReason: result.scriptUnavailableReason,
    flowTitle: result.script?.flowTitle ?? null,
    "steps.length": result.script?.steps.length ?? null,
  });

  if (input.type === "venta" && input.lines.length > 0) {
    try {
      const persistedScript = await getLeadRepository().getSalesScriptByGestionId(lead.id);
      logScriptSaveCheckpoint("saveLeadWithScript · relectura BD inmediata", {
        id: lead.id,
        "sales_script != null": persistedScript !== null,
        "sales_script.flowTitle": persistedScript?.flowTitle ?? null,
        "sales_script.steps.length": persistedScript?.steps.length ?? null,
        scriptUnavailableReason: result.scriptUnavailableReason,
      });
    } catch (error) {
      logScriptSaveCheckpoint("saveLeadWithScript · relectura BD falló", {
        id: lead.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
