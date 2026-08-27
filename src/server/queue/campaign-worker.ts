import "server-only";
import { Worker } from "bullmq";
import { getRedisConnection, isQueueEnabled } from "@/server/queue/redis";
import { CAMPAIGN_QUEUE_NAME, type CampaignJobData } from "@/server/queue/campaign-jobs";
import { campaignTickJobExists, enqueueCampaignTick } from "@/server/queue/campaign-queue";
import { getCampaignRepository } from "@/repositories/campaign.repository";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { getMessageProvider } from "@/server/campaigns/message-provider";
import "@/server/campaigns/mock-provider"; // registra el provider "mock" (side-effect import)
import { evaluateRisk } from "@/server/campaigns/risk-controller";
import { resolveMessageForContact } from "@/lib/campaigns/message-template";
import { isCampaignsKillSwitchActive } from "@/lib/campaigns/kill-switch";
import { normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";
import type { Campaign } from "@/types/campaign";

async function emit() {
  return import("@/server/realtime/emit");
}

async function reportProgress(campaign: Campaign) {
  const { emitCampaignProgress } = await emit();
  emitCampaignProgress({
    campaignId: campaign.id,
    status: campaign.status,
    sentCount: campaign.sentCount,
    failedCount: campaign.failedCount,
    responseCount: campaign.responseCount,
    optOutCount: campaign.optOutCount,
    excludedCount: campaign.excludedCount,
    totalContacts: campaign.totalContacts,
  });
}

async function reportEvent(campaignId: string, eventType: string, metadata?: Record<string, unknown>) {
  const { emitCampaignEvent } = await emit();
  emitCampaignEvent({ campaignId, eventType, metadata });
}

/** Procesa exactamente un contacto de la campaña y decide si reprogramar el siguiente tick. */
async function processCampaignTick(campaignId: string, jobId: string): Promise<void> {
  const repo = getCampaignRepository();
  const campaign = await repo.getCampaignById(campaignId);
  if (!campaign) return;

  // CAS atómico: confirma que este tick sigue siendo el único autorizado
  // para esta campaña (ver confirmTickOwnership). Toda transición que saca
  // la campaña de EJECUTANDO también limpia current_job_id, así que pasar
  // esta confirmación implica que la campaña sigue en EJECUTANDO — es la
  // única fuente de verdad, no una lectura-y-decide que pueda perder una
  // carrera entre dos ticks casi simultáneos.
  const owns = await repo.confirmTickOwnership(campaignId, jobId);
  if (!owns) return;

  if (await isCampaignsKillSwitchActive()) {
    if (campaign.status === "EJECUTANDO") {
      await repo.setStatus(campaignId, "PAUSADA", { currentJobId: null });
      await repo.logEvent(campaignId, "CAMPAIGN_PAUSED", { reason: "kill_switch_global" });
      await reportEvent(campaignId, "CAMPAIGN_PAUSED", { reason: "kill_switch_global" });
    }
    return;
  }

  if (campaign.status !== "EJECUTANDO") return;

  const contact = await repo.claimNextPendingContact(campaignId);

  if (!contact) {
    await repo.setStatus(campaignId, "COMPLETADA", { currentJobId: null });
    await repo.logEvent(campaignId, "CAMPAIGN_COMPLETED");
    const finished = await repo.getCampaignById(campaignId);
    if (finished) {
      await reportProgress(finished);
      await reportEvent(campaignId, "CAMPAIGN_COMPLETED");
    }
    return;
  }

  await repo.logEvent(campaignId, "MESSAGE_PROCESSING", {}, contact.id);

  // Re-chequeo de suppression list justo antes de enviar — pudo pedir baja después del import.
  if (await repo.isPhoneSuppressed(campaign.companyId, contact.phone)) {
    await repo.excludeContactAtSendTime(contact.id);
    await repo.logEvent(campaignId, "OPT_OUT_DETECTED", { detectedAt: "send_time" }, contact.id);
    await scheduleNext(campaign, jobId, 0);
    return;
  }

  const { text, missingVariables } = resolveMessageForContact(campaign.messageTemplate, contact.rawPayload);
  if (missingVariables.length > 0 || !text.trim()) {
    const errorMsg = `Variables faltantes: ${missingVariables.join(", ") || "mensaje vacío"}.`;
    await repo.markContactFailed(contact.id, errorMsg);
    await repo.logEvent(campaignId, "MESSAGE_FAILED", { reason: "missing_variables", missingVariables }, contact.id);
    await afterFailure(campaign, jobId);
    return;
  }

  const provider = getMessageProvider(campaign.provider);
  const providerConnected = await provider.validateConnection();

  const conversationId = normalizeWhatsAppPhoneDigits(contact.phone);
  const sendResult = providerConnected
    ? await provider.sendMessage({
        conversationId,
        phone: contact.phone,
        message: text,
        metadata: { campaignId, campaignContactId: contact.id },
      })
    : { success: false, error: "Proveedor de mensajería no disponible." };

  if (sendResult.success) {
    const nowIso = new Date().toISOString();
    const sql = (await import("@/server/db/client")).getSql();
    await getConversationRepository().saveMessage({
      waMessageId: sendResult.messageId ?? `campaign-${contact.id}`,
      conversationId,
      phone: conversationId,
      customerName: contact.name || conversationId,
      body: text,
      direction: "out",
      createdAt: nowIso,
    });
    if (sql) {
      await sql`
        UPDATE lead_conversations
        SET source = 'campaign', campaign_id = ${campaignId}, campaign_name = ${campaign.name}
        WHERE id = ${conversationId}
      `;
    }
    await repo.markContactSent(contact.id, sendResult.messageId ?? "", conversationId);
    await repo.logEvent(campaignId, "MESSAGE_SENT", { providerMessageId: sendResult.messageId }, contact.id);
    const updated = await repo.getCampaignById(campaignId);
    if (updated) await reportProgress(updated);
    await scheduleNext(campaign, jobId, campaign.intervalSeconds * 1000);
    return;
  }

  await repo.markContactFailed(contact.id, sendResult.error ?? "Error desconocido del proveedor.");
  await repo.logEvent(campaignId, "MESSAGE_FAILED", { error: sendResult.error, providerConnected }, contact.id);
  await afterFailure(campaign, jobId, providerConnected);
}

/** Evalúa risk controller tras una falla; si dispara auto-pausa, no reprograma. */
async function afterFailure(campaign: Campaign, jobId: string, providerConnected = true): Promise<void> {
  const repo = getCampaignRepository();
  const refreshed = await repo.getCampaignById(campaign.id);
  if (!refreshed) return;
  await reportProgress(refreshed);

  const evaluation = evaluateRisk({
    consecutiveFailures: refreshed.consecutiveFailures,
    recentOptOuts: refreshed.optOutCount,
    recentProcessed: refreshed.sentCount + refreshed.failedCount,
    providerConnected,
  });

  if (evaluation.shouldAutoPause) {
    await repo.setStatus(campaign.id, "AUTO_PAUSADA", { riskReason: evaluation.reason, currentJobId: null });
    await repo.logEvent(campaign.id, "CAMPAIGN_AUTO_PAUSED", { reason: evaluation.reason });
    await reportEvent(campaign.id, "CAMPAIGN_AUTO_PAUSED", { reason: evaluation.reason });
    return;
  }

  await scheduleNext(refreshed, jobId, refreshed.intervalSeconds * 1000);
}

/**
 * Reprograma el siguiente tick si la campaña sigue EJECUTANDO — sin importar
 * si quedan pendientes: es el PRÓXIMO tick el que reclama y, si no hay nada
 * que reclamar, cierra la campaña como COMPLETADA. No reprogramar aquí por
 * "no quedan pendientes" la dejaría corriendo para siempre sin nadie que la
 * cierre.
 */
async function scheduleNext(campaign: Campaign, currentJobId: string, delayMs: number): Promise<void> {
  const repo = getCampaignRepository();
  const stillActive = await repo.getCampaignById(campaign.id);
  if (!stillActive || stillActive.status !== "EJECUTANDO") return;

  const nextJobId = await enqueueCampaignTick(campaign.id, delayMs);
  if (nextJobId) {
    await repo.setCurrentJobId(campaign.id, nextJobId);
  }
  void currentJobId;
}

let worker: Worker<CampaignJobData> | null = null;
let started = false;

export function ensureCampaignWorker(): void {
  if (started || !isQueueEnabled()) return;
  const connection = getRedisConnection();
  if (!connection) return;

  started = true;
  worker = new Worker<CampaignJobData>(
    CAMPAIGN_QUEUE_NAME,
    async (job) => {
      await processCampaignTick(job.data.campaignId, String(job.id));
    },
    { connection, concurrency: 5 },
  );

  worker.on("failed", async (job, err) => {
    console.error("[campaign-worker] tick failed", job?.id, err);
    const campaignId = job?.data?.campaignId;
    if (!campaignId) return;
    try {
      const repo = getCampaignRepository();
      await repo.logEvent(campaignId, "MESSAGE_FAILED", { error: String(err), fatal: true });
    } catch (logErr) {
      console.error("[campaign-worker] no se pudo registrar el evento de fallo", logErr);
    }
  });

  worker.on("error", (err) => console.error("[campaign-worker] error", err));

  console.log("[campaign-worker] BullMQ consumer started (concurrency=5, un tick = un contacto)");
}

export async function closeCampaignWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  started = false;
}

/**
 * Recuperación tras reinicio del server (sección 33): reprograma un tick
 * para toda campaña que quedó EJECUTANDO. BullMQ persiste los jobs en
 * Redis, no en memoria del proceso — un reinicio del server NO borra un
 * tick con delay que ya estaba esperando. Por eso primero se comprueba si
 * `current_job_id` sigue vivo en la cola antes de crear uno nuevo: crearlo
 * a ciegas duplicaría el tick (dos activos para la misma campaña).
 */
export async function resumeActiveCampaignsOnBoot(): Promise<void> {
  if (!isQueueEnabled()) return;
  try {
    const repo = getCampaignRepository();
    const campaigns = await repo.listActiveCampaigns();
    let resumed = 0;
    for (const c of campaigns) {
      if (c.currentJobId && (await campaignTickJobExists(c.currentJobId))) {
        continue; // ya hay un tick vivo en Redis, no duplicar
      }
      const jobId = await enqueueCampaignTick(c.id, 0);
      if (jobId) {
        await repo.setCurrentJobId(c.id, jobId);
        resumed++;
      }
    }
    if (resumed > 0) {
      console.log(`[campaign-worker] ${resumed} campaña(s) reanudada(s) tras reinicio`);
    }
  } catch (err) {
    console.error("[campaign-worker] resumeActiveCampaignsOnBoot", err);
  }
}
