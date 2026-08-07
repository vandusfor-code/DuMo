import type { AuthRole } from "@/types/auth";

/**
 * Capacidades granulares — preparado para RBAC futuro.
 * Hoy se resuelven por rol; mañana pueden mapearse a permisos por usuario.
 */
export const QUICK_REPLY_CAPABILITIES = [
  "quick_reply.use",
  "quick_reply.create",
  "quick_reply.edit",
  "quick_reply.delete",
  "quick_reply.manage_categories",
  "quick_reply.manage_tags",
  "quick_reply.manage_media",
  "quick_reply.restore",
  "quick_reply.view_versions",
  "quick_reply.revert_version",
] as const;

export type QuickReplyCapability = (typeof QUICK_REPLY_CAPABILITIES)[number];

const ADMIN_CAPABILITIES: QuickReplyCapability[] = [...QUICK_REPLY_CAPABILITIES];

const USE_ONLY: QuickReplyCapability[] = ["quick_reply.use"];

/** Matriz rol → capacidades (extensible a tabla user_permissions). */
export function capabilitiesForRole(role: AuthRole): ReadonlySet<QuickReplyCapability> {
  switch (role) {
    case "administrador":
      return new Set(ADMIN_CAPABILITIES);
    case "supervisor":
    case "asesora":
      return new Set(USE_ONLY);
    case "sistema":
      return new Set(ADMIN_CAPABILITIES);
    default:
      return new Set();
  }
}

export function hasCapability(role: AuthRole, capability: QuickReplyCapability): boolean {
  return capabilitiesForRole(role).has(capability);
}
