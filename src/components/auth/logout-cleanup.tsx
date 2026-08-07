"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { clearClientToken } from "@/lib/auth/client-token";

/**
 * Solo limpia el token de respaldo tras un cierre de sesión explícito
 * (/logout → /login?signedOut=1). No borrar en redirecciones por fallo
 * transitorio de auth evita perder el Bearer de respaldo.
 */
export function LogoutCleanup() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("signedOut") === "1") {
      clearClientToken();
    }
  }, [searchParams]);

  return null;
}
