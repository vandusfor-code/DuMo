"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSetOwnPresence } from "@/hooks/use-advisor-presence";
import { useIdleWarning } from "@/hooks/use-idle-warning";
import { isAdvisorPresenceStatus } from "@/lib/advisor-presence";
import { PresencePromptModal } from "@/components/leads/presence-prompt-modal";

/** Tras 8 min sin actividad real (mouse/teclado/scroll), se pregunta si sigue disponible. */
const IDLE_WARNING_AFTER_MS = 8 * 60 * 1000;
/** Si no responde al aviso en 90s más, se desconecta sola — antes de que la alcance el barrido del servidor (10 min). */
const IDLE_AUTO_DISCONNECT_AFTER_MS = 90 * 1000;

const SESSION_FLAG = "dumo_availability_prompt_shown";

/**
 * Dos avisos emergentes para la asesora, montados una sola vez en el shell:
 * 1) Al conectarse, si no está "disponible", invita a activarse — con el
 *    botón ahí mismo (una vez por pestaña, no insiste después de "Ahora no").
 * 2) Si lleva ~8 min sin actividad estando "disponible", pregunta si sigue
 *    ahí antes de desconectarla — para que el estado "conectada" en Live sea
 *    real y no dependa solo del barrido de 10 min del servidor.
 * No aplica a admin/supervisor — solo a role === "asesora".
 */
export function AdvisorAvailabilityManager() {
  const { data: user } = useCurrentUser();
  const setPresence = useSetOwnPresence();

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const promptCheckedRef = useRef(false);

  const isAdvisor = user?.role === "asesora";
  const currentStatus = isAdvisorPresenceStatus(user?.presenceStatus ?? "")
    ? user!.presenceStatus!
    : "desconectado";

  useEffect(() => {
    if (!isAdvisor || !user || promptCheckedRef.current) return;
    promptCheckedRef.current = true;
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    sessionStorage.setItem(SESSION_FLAG, "1");
    if (currentStatus !== "disponible") {
      setShowLoginPrompt(true);
    }
  }, [isAdvisor, user, currentStatus]);

  const { warning: showIdlePrompt, reset: resetIdle, dismiss: dismissIdle } = useIdleWarning({
    enabled: isAdvisor && currentStatus === "disponible",
    warnAfterMs: IDLE_WARNING_AFTER_MS,
    autoActionAfterMs: IDLE_AUTO_DISCONNECT_AFTER_MS,
    onAutoAction: () => setPresence.mutate("desconectado"),
  });

  if (!isAdvisor) return null;

  return (
    <>
      <PresencePromptModal
        open={showLoginPrompt}
        icon={<Wifi className="size-6" />}
        title="¿Lista para recibir mensajes?"
        description="Actívate como disponible para empezar a recibir leads nuevos ahora mismo."
      >
        <Button
          onClick={() => {
            setPresence.mutate("disponible");
            setShowLoginPrompt(false);
          }}
          disabled={setPresence.isPending}
        >
          Activarme como disponible
        </Button>
        <Button variant="secondary" onClick={() => setShowLoginPrompt(false)}>
          Ahora no
        </Button>
      </PresencePromptModal>

      <PresencePromptModal
        open={showIdlePrompt}
        icon={<AlertTriangle className="size-6" />}
        title="¿Sigues ahí?"
        description="Llevas un rato sin actividad. Si no respondes, te vamos a marcar como desconectada y dejarás de recibir leads nuevos."
      >
        <Button
          onClick={() => {
            setPresence.mutate("disponible");
            resetIdle();
          }}
          disabled={setPresence.isPending}
        >
          Seguir disponible
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            dismissIdle();
            setPresence.mutate("desconectado");
          }}
          disabled={setPresence.isPending}
        >
          Desconectarme
        </Button>
      </PresencePromptModal>
    </>
  );
}
