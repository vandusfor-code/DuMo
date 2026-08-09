import "server-only";
import { getConversationRepository } from "@/repositories/conversation.repository";
import type { TenantScope } from "@/lib/tenant-scope";

export class ConversationAccessError extends Error {
  readonly status: 403 | 404;

  constructor(message: string, status: 403 | 404 = 403) {
    super(message);
    this.name = "ConversationAccessError";
    this.status = status;
  }
}

/** Admin y supervisor ven todas las conversaciones; asesora solo las asignadas a ella. */
export function isLeadsAdminScope(scope: TenantScope): boolean {
  return scope.role === "administrador" || scope.role === "supervisor";
}

export function advisorIdForConversations(scope: TenantScope): string | undefined {
  return scope.role === "asesora" ? scope.userId : undefined;
}

/** Lanza si la asesora no es la titular de la conversación. */
export async function assertConversationAccess(
  conversationId: string,
  scope: TenantScope,
): Promise<void> {
  if (isLeadsAdminScope(scope)) return;

  if (scope.role !== "asesora") {
    throw new ConversationAccessError("No autorizado.", 403);
  }

  const assignedAdvisorId = await getConversationRepository().getAssignedAdvisorId(conversationId);
  if (!assignedAdvisorId) {
    throw new ConversationAccessError("Conversación no encontrada.", 404);
  }
  if (assignedAdvisorId !== scope.userId) {
    throw new ConversationAccessError("No autorizado para esta conversación.", 403);
  }
}
