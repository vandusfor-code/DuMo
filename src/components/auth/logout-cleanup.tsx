"use client";

import { useEffect } from "react";
import { clearClientToken } from "@/lib/auth/client-token";

/**
 * Al llegar al login se limpia el token de respaldo: así "Cerrar sesión"
 * (que pasa por /logout y termina en /login) borra ambos mecanismos.
 */
export function LogoutCleanup() {
  useEffect(() => {
    clearClientToken();
  }, []);
  return null;
}
