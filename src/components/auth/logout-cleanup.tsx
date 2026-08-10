"use client";

import { useEffect } from "react";
import { clearClientToken } from "@/lib/auth/client-token";

/**
 * Solo limpia el token de respaldo tras un cierre de sesión explícito
 * (/logout → /login?signedOut=1). No borrar en redirecciones por fallo
 * transitorio de auth evita perder el Bearer de respaldo.
 */
export function LogoutCleanup({ signedOut }: { signedOut?: boolean }) {
  useEffect(() => {
    if (signedOut) {
      clearClientToken();
    }
  }, [signedOut]);

  return null;
}
