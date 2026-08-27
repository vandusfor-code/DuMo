"use client";

import { useEffect, useRef } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

/**
 * Al cerrar la pestaña/navegador, avisa al servidor para marcar a la asesora
 * "desconectado" al instante — sin esto, se queda "disponible" hasta que el
 * barrido por inactividad la alcance (hasta 10 min después).
 */
export function usePresenceDisconnectBeacon() {
  const { data: user } = useCurrentUser();
  const statusRef = useRef(user?.presenceStatus);
  statusRef.current = user?.presenceStatus;

  useEffect(() => {
    const handlePageHide = () => {
      if (statusRef.current && statusRef.current !== "desconectado") {
        navigator.sendBeacon("/api/advisors/me/presence/beacon");
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);
}
