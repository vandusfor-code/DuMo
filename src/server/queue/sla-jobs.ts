import "server-only";

export type SlaCheckJob = { conversationId: string };

export const SLA_QUEUE_NAME = "response-sla-checks";

export function slaJobId(conversationId: string): string {
  return `sla:${conversationId}`;
}
