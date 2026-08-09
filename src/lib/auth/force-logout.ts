"use client";

import { clearClientToken } from "@/lib/auth/client-token";

/** Expulsión forzada (revocación admin o auto-desconexión). Limpia Bearer y borra cookie vía /logout. */
export function forceSessionLogout(reason?: string) {
  clearClientToken();
  const params = new URLSearchParams({ signedOut: "1" });
  if (reason) params.set("reason", reason);
  window.location.href = `/logout?${params.toString()}`;
}
