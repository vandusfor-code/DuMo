import "server-only";
import { getCampaignRepository, type NewContactInput } from "@/repositories/campaign.repository";
import { classifyContacts } from "@/lib/campaigns/contact-import";
import { extractTemplateVariables, resolveMessageForContact } from "@/lib/campaigns/message-template";
import { enqueueCampaignTick, isCampaignQueueEnabled } from "@/server/queue/campaign-queue";
import { isCampaignsKillSwitchActive, setCampaignsKillSwitch } from "@/lib/campaigns/kill-switch";
import type {
  Campaign,
  CampaignColumnMapping,
  CampaignContact,
  CampaignEvent,
  CampaignSettingsInput,
  CampaignValidationSummary,
} from "@/types/campaign";

export interface CampaignActor {
  companyId: string;
  userId: string;
}

function assertActiveCampaign(campaign: Campaign | null, id: string): Campaign {
  if (!campaign) throw new Error(`Campaña "${id}" no encontrada.`);
  return campaign;
}

export const campaignService = {
  async create(actor: CampaignActor, name: string, description = ""): Promise<Campaign> {
    if (!name.trim()) throw new Error("El nombre de la campaña es obligatorio.");
    const repo = getCampaignRepository();
    const campaign = await repo.createCampaign(actor.companyId, name, description, actor.userId);
    await repo.logEvent(campaign.id, "CAMPAIGN_CREATED", { name });
    return campaign;
  },

  async get(actor: CampaignActor, id: string): Promise<Campaign> {
    const repo = getCampaignRepository();
    return assertActiveCampaign(await repo.getCampaign(actor.companyId, id), id);
  },

  async list(actor: CampaignActor): Promise<Campaign[]> {
    return getCampaignRepository().listCampaigns(actor.companyId);
  },

  /**
   * El parseo del archivo (xlsx→filas) y la sugerencia de mapeo ocurren en
   * el cliente (mismo patrón que PCS: `parseCampaignWorkbook`/`detectColumnMapping`
   * de `@/lib/campaigns/contact-import` son funciones puras, sin `"server-only"`,
   * pensadas para correr en el browser). Lo que importa para seguridad — validar
   * teléfono, dedupe, suppression list — se recalcula acá, server-side, sin
   * confiar en nada que venga clasificado desde el cliente.
   */
  async confirmImportAndValidate(
    actor: CampaignActor,
    campaignId: string,
    rows: Record<string, string>[],
    mapping: CampaignColumnMapping,
  ): Promise<CampaignValidationSummary> {
    const repo = getCampaignRepository();
    const campaign = assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    if (campaign.status === "EJECUTANDO" || campaign.status === "PAUSADA" || campaign.status === "AUTO_PAUSADA") {
      throw new Error("No se puede reimportar contactos mientras la campaña está en curso.");
    }
    if (!Object.values(mapping).includes("phone")) {
      throw new Error("Debes mapear una columna como Teléfono.");
    }

    // Primera pasada sin suppression list (chequeo async, se aplica en la segunda pasada abajo).
    const classified = classifyContacts(rows, mapping, () => ({ suppressed: false, isOptOut: false }));
    // Segunda pasada: ahora sí con el chequeo real de suppression list (evita N consultas por fila arriba).
    const finalRows: typeof classified = [];
    for (const c of classified) {
      if (c.status !== "PENDING") {
        finalRows.push(c);
        continue;
      }
      const suppressed = await repo.isPhoneSuppressed(actor.companyId, c.phone);
      finalRows.push(suppressed ? { ...c, status: "EXCLUDED", error: "Contacto en lista de exclusión." } : c);
    }

    const contacts: NewContactInput[] = finalRows.map((c) => ({
      rawPayload: c.rawPayload,
      name: c.name,
      phone: c.phone,
      phoneRaw: c.phoneRaw,
      status: c.status,
      error: c.error,
    }));

    await repo.replaceContacts(actor.companyId, campaignId, contacts);
    await repo.logEvent(campaignId, "FILE_IMPORTED", { totalRows: rows.length });
    await repo.setStatus(campaignId, "VALIDANDO");
    await repo.logEvent(campaignId, "CONTACT_VALIDATED", {});

    const summary: CampaignValidationSummary = {
      total: finalRows.length,
      eligible: finalRows.filter((c) => c.status === "PENDING").length,
      invalid: finalRows.filter((c) => c.status === "INVALID").length,
      duplicate: finalRows.filter((c) => c.status === "DUPLICATE").length,
      excluded: finalRows.filter((c) => c.status === "EXCLUDED").length,
      optedOut: finalRows.filter((c) => c.status === "OPTED_OUT").length,
    };
    return summary;
  },

  async updateMessage(actor: CampaignActor, campaignId: string, messageTemplate: string): Promise<void> {
    const repo = getCampaignRepository();
    assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    await repo.updateMessageTemplate(actor.companyId, campaignId, messageTemplate);
  },

  /** Preview con 2-3 ejemplos reales (sección 14) — muestra el mensaje ya resuelto para contactos reales. */
  async previewMessages(actor: CampaignActor, campaignId: string, sampleSize = 3) {
    const repo = getCampaignRepository();
    const campaign = assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    const contacts = await repo.listContacts(campaignId);
    const eligible = contacts.filter((c) => c.status === "PENDING").slice(0, sampleSize);
    return eligible.map((c) => ({
      contactId: c.id,
      name: c.name,
      phone: c.phone,
      ...resolveMessageForContact(campaign.messageTemplate, c.rawPayload),
    }));
  },

  extractVariables(template: string): string[] {
    return extractTemplateVariables(template);
  },

  async updateSettings(actor: CampaignActor, campaignId: string, settings: CampaignSettingsInput): Promise<void> {
    if (settings.intervalSeconds < 1) throw new Error("El intervalo debe ser de al menos 1 segundo.");
    if (settings.concurrency < 1) throw new Error("La concurrencia debe ser al menos 1.");
    const repo = getCampaignRepository();
    assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    await repo.updateSettings(actor.companyId, campaignId, settings);
  },

  async start(actor: CampaignActor, campaignId: string): Promise<Campaign> {
    if (!isCampaignQueueEnabled()) {
      throw new Error("La cola de envío no está disponible (Redis no configurado).");
    }
    const repo = getCampaignRepository();
    const campaign = assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    if (!campaign.messageTemplate.trim()) throw new Error("La campaña no tiene mensaje configurado.");
    if (!(await repo.hasPendingContacts(campaignId))) {
      throw new Error("No hay contactos elegibles para enviar.");
    }
    if (campaign.status !== "BORRADOR" && campaign.status !== "VALIDANDO" && campaign.status !== "PROGRAMADA") {
      throw new Error(`No se puede iniciar una campaña en estado ${campaign.status}.`);
    }

    await repo.setStatus(campaignId, "EJECUTANDO");
    const jobId = await enqueueCampaignTick(campaignId, 0);
    if (jobId) await repo.setCurrentJobId(campaignId, jobId);
    await repo.logEvent(campaignId, "CAMPAIGN_STARTED");
    return assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
  },

  async pause(actor: CampaignActor, campaignId: string): Promise<Campaign> {
    const repo = getCampaignRepository();
    const campaign = assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    if (campaign.status !== "EJECUTANDO" && campaign.status !== "AUTO_PAUSADA") {
      throw new Error(`No se puede pausar una campaña en estado ${campaign.status}.`);
    }
    await repo.setStatus(campaignId, "PAUSADA", { currentJobId: null });
    await repo.logEvent(campaignId, "CAMPAIGN_PAUSED", { manual: true });
    return assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
  },

  async resume(actor: CampaignActor, campaignId: string): Promise<Campaign> {
    if (!isCampaignQueueEnabled()) {
      throw new Error("La cola de envío no está disponible (Redis no configurado).");
    }
    if (await isCampaignsKillSwitchActive()) {
      throw new Error("El interruptor de emergencia global está activo — no se pueden reanudar campañas.");
    }
    const repo = getCampaignRepository();
    const campaign = assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    if (campaign.status !== "PAUSADA" && campaign.status !== "AUTO_PAUSADA") {
      throw new Error(`No se puede reanudar una campaña en estado ${campaign.status}.`);
    }
    await repo.setStatus(campaignId, "EJECUTANDO");
    const jobId = await enqueueCampaignTick(campaignId, 0);
    if (jobId) await repo.setCurrentJobId(campaignId, jobId);
    await repo.logEvent(campaignId, "CAMPAIGN_RESUMED");
    return assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
  },

  async cancel(actor: CampaignActor, campaignId: string): Promise<Campaign> {
    const repo = getCampaignRepository();
    const campaign = assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    if (campaign.status === "COMPLETADA" || campaign.status === "CANCELADA") {
      throw new Error(`La campaña ya está en estado ${campaign.status}.`);
    }
    await repo.cancelPendingContacts(campaignId);
    await repo.setStatus(campaignId, "CANCELADA", { currentJobId: null });
    await repo.logEvent(campaignId, "CAMPAIGN_CANCELLED");
    return assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
  },

  async getDetail(actor: CampaignActor, campaignId: string) {
    const repo = getCampaignRepository();
    const campaign = assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    const [countsByStatus, events, staleContacts] = await Promise.all([
      repo.countContactsByStatus(campaignId),
      repo.listEvents(campaignId, 50),
      repo.listStaleProcessingContacts(campaignId),
    ]);
    return { campaign, countsByStatus, events, staleContacts };
  },

  async listContacts(actor: CampaignActor, campaignId: string): Promise<CampaignContact[]> {
    const repo = getCampaignRepository();
    assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    return repo.listContacts(campaignId);
  },

  async listEvents(actor: CampaignActor, campaignId: string, limit = 100): Promise<CampaignEvent[]> {
    const repo = getCampaignRepository();
    assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    return repo.listEvents(campaignId, limit);
  },

  /** Acción explícita del admin sobre un contacto atascado en PROCESSING — nunca automática. */
  async requeueStaleContact(actor: CampaignActor, campaignId: string, contactId: string): Promise<void> {
    const repo = getCampaignRepository();
    assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    await repo.requeueStaleContact(contactId);
    await repo.logEvent(campaignId, "CONTACT_STALE_REQUEUED", {}, contactId);
  },

  async markStaleContactFailed(actor: CampaignActor, campaignId: string, contactId: string): Promise<void> {
    const repo = getCampaignRepository();
    assertActiveCampaign(await repo.getCampaign(actor.companyId, campaignId), campaignId);
    await repo.markStaleContactFailed(contactId);
    await repo.logEvent(campaignId, "CONTACT_STALE_MARKED_FAILED", {}, contactId);
  },

  async addSuppression(actor: CampaignActor, phone: string, reason: string, source = "manual"): Promise<void> {
    const repo = getCampaignRepository();
    await repo.addSuppression(actor.companyId, phone, reason, source);
  },

  listSuppressions(actor: CampaignActor) {
    return getCampaignRepository().listSuppressions(actor.companyId);
  },

  getKillSwitch(): Promise<boolean> {
    return isCampaignsKillSwitchActive();
  },

  setKillSwitch(active: boolean): Promise<void> {
    return setCampaignsKillSwitch(active);
  },
};
