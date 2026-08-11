import "server-only";
import { getResponseSlaRepository } from "@/repositories/response-sla.repository";
import { cancelSlaCheck, scheduleSlaCheck } from "@/server/queue/sla-queue";
import {
  RESPONSE_SLA_THRESHOLDS,
  delayMsUntilThreshold,
  nextThresholdMinutes,
  type ResponseSlaScenario,
} from "@/types/response-sla";

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

/**
 * Núcleo compartido por el worker de BullMQ y el barrido periódico — misma
 * función, dos caminos de disparo. Relee el estado real (FOR UPDATE) antes
 * de actuar (regla de desempate B), y si quedan umbrales por evaluar,
 * reprograma el siguiente chequeo diferido.
 */
export async function reconcileConversationTimer(conversationId: string): Promise<void> {
  const repo = getResponseSlaRepository();
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
    const elapsedMinutes = Math.max(
      0,
      Math.round((Date.now() - new Date(result.timer.armedAt).getTime()) / 60_000),
    );
    emitLeadsSlaWarning({
      conversationId,
      advisorId: result.timer.advisorId,
      customerName,
      scenario: result.timer.scenario,
      status: result.newStatus,
      minutesUnanswered: elapsedMinutes,
    });
  }

  const nextMinutes = nextThresholdMinutes(result.timer.scenario, result.newStatus);
  if (nextMinutes === null) return; // threshold_reached — RESP-3 continúa desde aquí.

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
