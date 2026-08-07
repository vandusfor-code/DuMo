"use client";

import { useEffect } from "react";
import { saveClientToken } from "@/lib/auth/client-token";

/**
 * Sincroniza el token de sesión al montar el layout autenticado.
 * Complementa useCurrentUser: corre antes de que el sidebar pinte.
 */
export function SessionSync() {
  useEffect(() => {
    fetch("/api/users/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { sessionToken?: string };
        if (data.sessionToken) saveClientToken(data.sessionToken);
      })
      .catch(() => {
        /* sin conexión: se conserva el token previo */
      });
  }, []);

  return null;
}
