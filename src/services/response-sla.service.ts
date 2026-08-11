import "server-only";
import { getResponseSlaRepository } from "@/repositories/response-sla.repository";
import { cancelSlaCheck, scheduleSlaCheck } from "@/server/queue/sla-queue";
import {
  RESPONSE_SLA_THRESHOLDS,
  SLA_ESCALATION_RETRY_MS,
  buildSlaAdminAlertMessage,
  delayMsUntilThreshold,
  nextThresholdMinutes,
  slaChannelLabel,
  type ResponseSlaScenario,
} from "@/types/response-sla";
import { resolveConversationChannel } from "@/lib/conversation-channel";

/**
 * RESP-1 — se llama al FINAL de `leadsService.receiveMessage()`, después de
 * que la reapertura P2 y el auto-assign ya corrieron (regla de desempate A:
 * P2 siempre se resuelve primero, el timer se arma después con el estado ya
 * actualizado). Si no hay asesora asignada tras ese proceso, no se arma nada
 * — no hay a quién responsabilizar.
 */
export async function armTimerAfterInboundMessage(input: {
  conversationId: string;
  assignedAdvisorId: string | null;
  messageId: string;
}): Promise<void> {
  if (!input.assignedAdvisorId) return;

  const repo = getResponseSlaRepository();
  const hadPriorReply = await repo.hasPriorOutboundMessage(input.conversationId);
  const scenario: ResponseSlaScenario = hadPriorReply ? "follow_up" : "first_contact";

  await repo.armOrReset({
    conversationId: input.conversationId,
    advisorId: input.assignedAdvisorId,
    scenario,
    triggerMessageId: input.messageId,
    bullmqJobId: null,
  });

  const delayMs = RESPONSE_SLA_THRESHOLDS[scenario].warningMinutes * 60_000;
  const jobId = await scheduleSlaCheck(input.conversationId, delayMs);
  if (jobId) {
    await repo.armOrReset({
      conversationId: input.conversationId,
      advisorId: input.assignedAdvisorId,
      scenario,
      triggerMessageId: input.messageId,
      bullmqJobId: jobId,
    });
  }
}

/** Se llama cuando se persiste cualquier mensaje saliente (cualquier canal). */
export async function resolveTimerAfterOutboundMessage(conversationId: string): Promise<void> {
  const repo = getResponseSlaRepository();
  const { hadActiveTimer, advisorId } = await repo.resolve(conversationId);
  if (hadActiveTimer) {
    await cancelSlaCheck(conversationId);
    const { emitLeadsConversationUpdated } = await import("@/server/realtime/emit");
    emitLeadsConversationUpdated({
      conversationId,
      assignedAdvisorId: advisorId,
      reason: "sla-resolved",
    });
  }
}

function elapsedMinutesSince(armedAt: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(armedAt).getTime()) / 60_000));
}

/**
 * RESP-3 — al vencer el umbral: intenta reasignar a otra asesora disponible
 * (excluyéndola a ella explícitamente); si no hay ninguna, entra en
 * Escenario C — alerta web a la propia asesora + WhatsApp real a los
 * admins (con cooldown), y se reprograma para reintentar en 1 minuto,
 * indefinidamente, hasta que alguien responda o quede disponible una
 * asesora. Efectos externos (socket, WhatsApp) fuera de la transacción de
 * `reconcileEscalation` a propósito — si fallan, el estado en BD ya quedó
 * correcto y no hay que revertir nada.
 */
export async function escalateOrReassignTimer(conversationId: string): Promise<void> {
  const repo = getResponseSlaRepository();
  const result = await repo.reconcileEscalation(conversationId);
  if (result.kind === "noop") return;

  const { emitLeadsConversationUpdated, emitLeadsSlaWarning } = await import("@/server/realtime/emit");

  if (result.kind === "reassigned") {
    // La conversación cambió de dueña sin un mensaje entrante nuevo — se
    // arma el timer de la nueva asesora igual que si acabara de recibir el
    // mismo mensaje sin responder, para que el ciclo siga vigilando.
    await armTimerAfterInboundMessage({
      conversationId,
      assignedAdvisorId: result.newAdvisor.id,
      messageId: result.timer.triggerMessageId,
    });
    emitLeadsConversationUpdated({
      conversationId,
      assignedAdvisorId: result.newAdvisor.id,
      reason: "auto-assign",
    });
    emitLeadsConversationUpdated({
      conversationId,
      assignedAdvisorId: result.oldAdvisorId,
      reason: "auto-assign",
    });
    return;
  }

  // Escenario C.
  const customerName = await repo.getCustomerName(conversationId);
  const elapsedMinutes = elapsedMinutesSince(result.timer.armedAt);

  emitLeadsSlaWarning({
    conversationId,
    advisorId: result.timer.advisorId,
    customerName,
    scenario: result.timer.scenario,
    status: "escalated_no_advisor",
    minutesUnanswered: elapsedMinutes,
  });

  if (result.shouldSendAdminAlert) {
    const { sendSlaAdminAlert } = await import("@/server/web-qr/admin-alerts");
    const advisorName = await repo.getAdvisorName(result.timer.advisorId);
    const message = buildSlaAdminAlertMessage({
      customerName,
      advisorName,
      minutesUnanswered: elapsedMinutes,
      channelLabel: slaChannelLabel(resolveConversationChannel(conversationId)),
      conversationId,
    });
    await sendSlaAdminAlert(message).catch((err) =>
      console.error("[escalateOrReassignTimer] sendSlaAdminAlert", err),
    );
  }

  await scheduleSlaCheck(conversationId, SLA_ESCALATION_RETRY_MS);
}

/**
 * Núcleo compartido por el worker de BullMQ y el barrido periódico — misma
 * función, dos caminos de disparo. Relee el estado real (FOR UPDATE) antes
 * de actuar (regla de desempate B), y si quedan umbrales por evaluar,
 * reprograma el siguiente chequeo diferido.
 */
export async function reconcileConversationTimer(conversationId: string): Promise<void> {
  const repo = getResponseSlaRepository();

  // Escenario C ya activo: no pasa por la máquina de estados de umbrales de
  // nuevo, solo reintenta encontrar asesora / re-alertar.
  const current = await repo.getTimer(conversationId);
  if (current?.status === "escalated_no_advisor") {
    await escalateOrReassignTimer(conversationId);
    return;
  }

  const result = await repo.reconcileOne(conversationId);
  if (!result.transitioned || !result.timer || !result.newStatus) return;

  // RESP-2 — aviso a nivel de sesión (no solo el chat abierto): banner
  // flotante + indicador en la lista, sin importar qué esté viendo la
  // asesora en ese momento.
  if (result.newStatus === "warning_sent" || result.newStatus === "final_warning_sent") {
    const [{ emitLeadsSlaWarning }, customerName] = await Promise.all([
      import("@/server/realtime/emit"),
      repo.getCustomerName(conversationId),
    ]);
    emitLeadsSlaWarning({
      conversationId,
      advisorId: result.timer.advisorId,
      customerName,
      scenario: result.timer.scenario,
      status: result.newStatus,
      minutesUnanswered: elapsedMinutesSince(result.timer.armedAt),
    });
  }

  if (result.newStatus === "threshold_reached") {
    await escalateOrReassignTimer(conversationId);
    return;
  }

  const nextMinutes = nextThresholdMinutes(result.timer.scenario, result.newStatus);
  if (nextMinutes === null) return;

  const delayMs = delayMsUntilThreshold(nextMinutes, result.timer.armedAt);
  await scheduleSlaCheck(conversationId, delayMs);
}

/** Barrido de red de seguridad — reevalúa TODOS los timers activos desde cero, sin depender de BullMQ. */
export async function reconcileDueTimers(): Promise<void> {
  const repo = getResponseSlaRepository();
  const conversationIds = await repo.listActiveConversationIds();
  for (const conversationId of conversationIds) {
    try {
      await reconcileConversationTimer(conversationId);
    } catch (err) {
      console.error("[reconcileDueTimers]", conversationId, err);
    }
  }
}
