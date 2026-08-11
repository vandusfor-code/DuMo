import "server-only";
import type { AdvisorScope } from "@/lib/advisor-scope";
import { leadGestionToNewSaleInput } from "@/lib/lead-save";
import { resolveAdvisorScopeForLeadSave } from "@/lib/resolve-advisor-scope-for-lead";
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
import { tipificationService } from "@/services/tipification.service";
import { getTipificationRepository } from "@/repositories/tipification.repository";
import { applyInboxLifecycleAfterSave } from "@/services/inbox-lifecycle.service";
import { duoSalesService } from "@/services/duo-sales.service";
import { DUO_TIPIFICATION_SLUG } from "@/types/duo-sale";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import { FolioNumberValidationError } from "@/lib/folio-number";
import { validateFolioNumberForSale } from "@/services/folio-number.service";
import type { SaveLeadInput } from "@/types/lead";
import type { InboxState } from "@/types/inbox-state";
import type { SaveLeadResult } from "@/types/sales-script";

const SCRIPT_DEBUG = "[script-debug]";

function logScriptSaveCheckpoint(label: string, payload: Record<string, unknown>) {
  console.log(`${SCRIPT_DEBUG} ${label}`, JSON.stringify(payload, null, 2));
}

export async function saveLeadWithScript(
  input: SaveLeadInput,
  scope?: AdvisorScope | null,
): Promise<SaveLeadResult> {
  const companyId = DEFAULT_COMPANY_ID;
  const isSaleFlow = await tipificationService.triggersSaleFlowForSlug(companyId, input.type);
  const isDuoFlow = input.type === DUO_TIPIFICATION_SLUG;

  /**
   * El número de folio es opcional en cualquier gestión, pero obligatorio y
   * único en todo el sistema cuando se guarda como venta u Operación Duo —
   * se valida ANTES de guardar la gestión para que un folio inválido
   * bloquee todo el guardado, no solo el registro de la venta.
   */
  if (isSaleFlow || isDuoFlow) {
    const folioError = await validateFolioNumberForSale(input.folioNumber);
    if (folioError) throw new FolioNumberValidationError(folioError);
  }

  const effectiveScope = await resolveAdvisorScopeForLeadSave(input.conversationId, scope);
  const lead = await getLeadRepository().saveLead(input, effectiveScope);
  const advisor = effectiveScope ? { name: effectiveScope.name, email: "" } : undefined;

  // Operación Duo: crea la fila en duo_sales (cola paralela — no toca sales
  // ni el flujo de venta estándar). Requiere asesora de sesión conocida.
  let duoSaleError: string | null = null;
  if (input.type === DUO_TIPIFICATION_SLUG && input.duoSale) {
    if (effectiveScope) {
      try {
        await duoSalesService.create({
          conversationId: input.conversationId,
          gestionId: lead.id,
          customerName: input.customerName,
          rut: input.rut,
          phone: input.phone,
          originAdvisorId: effectiveScope.id,
          originAdvisorName: effectiveScope.name,
          folioNumber: input.folioNumber?.trim() ?? "",
          ...input.duoSale,
        });
      } catch (error) {
        console.error("[saveLeadWithScript] duo sale creation failed", error);
        duoSaleError = "La gestión se guardó, pero no se pudo crear el caso de Operación Duo.";
      }
    } else {
      duoSaleError =
        "La gestión se guardó, pero no se pudo crear el caso de Operación Duo (asigna una asesora al chat).";
    }
  }
  let script = null;
  let scriptUnavailableReason: string | null = null;
  let sale = null;
  let saleError: string | null = null;
  let clientSaved = false;
  let clientError: string | null = null;
  let inboxClosed = false;
  let inboxState: InboxState = "active";
  let followUpDatePersisted: string | null = null;
  let followUpCreated = false;

  const saleFlowOptions = { isSaleFlowType: isSaleFlow };

  const saveAction: SaveLeadAction =
    input.saveAction ?? (input.registerSale ? "sale" : "script");
  const shouldGenerateScript =
    saveAction !== "tipify" &&
    saveAction !== "close" &&
    isSaleFlow &&
    input.lines.length > 0;
  /**
   * P0 — CAUSA RAÍZ del hueco Ventas↔Metas↔Comisiones↔Contabilidad↔Dashboard:
   * esto antes exigía saveAction === "sale" | "script", así que guardar una
   * gestión "venta" completa con el botón genérico "Guardar y cerrar" (o con
   * Enter dentro de un campo, que dispara el submit nativo del formulario sin
   * pasar por el onClick del botón y deja saveModeRef en su default "close")
   * NUNCA registraba la venta — sin ningún error visible (sale:null,
   * saleError:null). Confirmado en producción: 24 de 28 gestiones "venta"
   * reales se perdieron así.
   *
   * Si la tipificación es de flujo de venta y hay al menos una línea
   * completa, la venta se registra siempre — independiente del botón que
   * disparó el guardado. saveAction solo decide si ADEMÁS se genera el
   * script de la llamada, nunca si la venta existe.
   */
  const shouldRegisterSale = isSaleFlow && input.lines.length > 0;

  if (shouldGenerateScript) {
    const main = input.lines[0];
    const unavailableReason = getScriptUnavailableReason(input, saleFlowOptions);
    const eligible = isScriptEligible(input, saleFlowOptions);

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
          isSaleFlowType: isSaleFlow,
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
            isSaleFlowType: isSaleFlow,
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

  if (shouldRegisterSale && effectiveScope) {
    const saleInput = leadGestionToNewSaleInput(input, saleFlowOptions);
    if (saleInput) {
      try {
        sale = await salesService.create(saleInput, effectiveScope);
      } catch (error) {
        console.error("[saveLeadWithScript] sale registration failed", error);
        saleError = "La gestión se guardó, pero no se pudo registrar en Mis Ventas.";
      }
    }
  } else if (shouldRegisterSale && !effectiveScope) {
    saleError =
      "La gestión se guardó, pero no se pudo registrar en Mis Ventas (asigna una asesora al chat).";
  }

  if (effectiveScope) {
    try {
      await crmClientsService.upsertFromGestion({
        conversationId: input.conversationId,
        customerName: input.customerName,
        rut: input.rut,
        phone: input.phone,
        gestionType: input.type,
        advisorId: effectiveScope.id,
        advisorName: effectiveScope.name,
        hasSale: Boolean(sale),
      });
      clientSaved = true;
    } catch (error) {
      console.error("[saveLeadWithScript] crm client upsert failed", error);
      clientError =
        "La gestión se guardó, pero no se pudo registrar en Clientes. Revisa la pantalla Clientes en unos segundos.";
    }
  } else if (shouldRegisterSale) {
    clientError =
      "La gestión se guardó, pero no se pudo vincular a Clientes (sin asesora asignada al chat).";
  }

  try {
    const catalog = await getTipificationRepository().listActive(DEFAULT_COMPANY_ID);
    const lifecycle = await applyInboxLifecycleAfterSave({
      gestionId: lead.id,
      conversationId: input.conversationId,
      slug: input.type,
      saveAction,
      followUpDate: input.followUpDate,
      saleRegistered: Boolean(sale),
      catalog,
    });
    inboxClosed = lifecycle.inboxClosed;
    inboxState = lifecycle.inboxState;
    followUpDatePersisted = lifecycle.followUpDate;
    followUpCreated = lifecycle.followUpCreated;
  } catch (error) {
    console.error("[saveLeadWithScript] inbox lifecycle apply failed", error);
    if (
      error instanceof Error &&
      (error.message.includes("seguimiento") ||
        error.message.includes("lead_follow_ups") ||
        error.message.includes("pendientes"))
    ) {
      throw error;
    }
  }

  const result: SaveLeadResult = {
    lead,
    script,
    scriptUnavailableReason: script ? null : scriptUnavailableReason,
    sale,
    saleError,
    saveAction,
    clientSaved,
    clientError,
    inboxClosed,
    inboxState,
    followUpDate: followUpDatePersisted,
    followUpCreated,
    duoSaleError,
  };

  logScriptSaveCheckpoint("saveLeadWithScript · antes de responder", {
    script: result.script ? "SI" : "NO",
    scriptUnavailableReason: result.scriptUnavailableReason,
    flowTitle: result.script?.flowTitle ?? null,
    "steps.length": result.script?.steps.length ?? null,
  });

  if (isSaleFlow && input.lines.length > 0) {
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
