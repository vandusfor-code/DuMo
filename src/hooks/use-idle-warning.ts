"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

/**
 * Aviso de inactividad genérico: tras `warnAfterMs` sin actividad real del
 * usuario, activa `warning`. Si nadie responde (ni `reset` ni `dismiss`) en
 * `autoActionAfterMs` más, dispara `onAutoAction` una sola vez. La actividad
 * normal del mouse/teclado NO cancela el aviso una vez mostrado — a partir
 * de ahí solo se resuelve llamando `reset` o `dismiss` explícitamente, para
 * que el aviso sea una pregunta real y no desaparezca solo porque el mouse
 * pasó por encima.
 */
export function useIdleWarning({
  enabled,
  warnAfterMs,
  autoActionAfterMs,
  onAutoAction,
}: {
  enabled: boolean;
  warnAfterMs: number;
  autoActionAfterMs: number;
  onAutoAction: () => void;
}) {
  const [warning, setWarning] = useState(false);
  const warningRef = useRef(false);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAutoActionRef = useRef(onAutoAction);
  onAutoActionRef.current = onAutoAction;

  const clearTimers = useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (actionTimer.current) clearTimeout(actionTimer.current);
    warnTimer.current = null;
    actionTimer.current = null;
  }, []);

  const armWarning = useCallback(() => {
    clearTimers();
    warnTimer.current = setTimeout(() => {
      warningRef.current = true;
      setWarning(true);
      actionTimer.current = setTimeout(() => {
        warningRef.current = false;
        setWarning(false);
        onAutoActionRef.current();
      }, autoActionAfterMs);
    }, warnAfterMs);
  }, [clearTimers, warnAfterMs, autoActionAfterMs]);

  /** El usuario confirmó que sigue ahí — apaga el aviso y reinicia el conteo. */
  const reset = useCallback(() => {
    warningRef.current = false;
    setWarning(false);
    armWarning();
  }, [armWarning]);

  /** El usuario ya resolvió el aviso por su cuenta (p. ej. se desconectó a propósito) — no reinicia el conteo. */
  const dismiss = useCallback(() => {
    clearTimers();
    warningRef.current = false;
    setWarning(false);
  }, [clearTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      warningRef.current = false;
      setWarning(false);
      return;
    }

    const onActivity = () => {
      if (warningRef.current) return; // ya se le preguntó — que responda al aviso, no basta con mover el mouse
      armWarning();
    };

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    armWarning();

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
    };
  }, [enabled, armWarning, clearTimers]);

  return { warning, reset, dismiss };
}
