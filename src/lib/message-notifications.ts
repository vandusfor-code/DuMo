let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

/** Desbloquea audio tras interacción del usuario (política del navegador). */
export function unlockMessageAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    audioUnlocked = true;
  } catch {
    /* ignore */
  }
}

function tone(freq: number, start: number, duration: number, peak: number) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = freq;
  osc.type = "square";
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.start(start);
  osc.stop(start + duration);
}

/** Sonido fuerte de mensaje nuevo — se oye aunque el volumen del PC no esté al máximo. */
export function playMessageSound(): void {
  if (typeof window === "undefined") return;
  unlockMessageAudio();
  if (!audioCtx || !audioUnlocked) return;
  try {
    const t = audioCtx.currentTime;
    tone(880, t, 0.16, 0.62);
    tone(1320, t + 0.11, 0.22, 0.72);
    tone(1760, t + 0.26, 0.18, 0.55);
  } catch {
    /* ignore */
  }
}

const recentMessageIds = new Set<string>();
const lastSoundByConversation = new Map<string, number>();

function rememberInboundSound(conversationId: string, messageId?: string) {
  if (messageId) {
    recentMessageIds.add(messageId);
    if (recentMessageIds.size > 400) {
      const oldest = recentMessageIds.values().next().value;
      if (oldest) recentMessageIds.delete(oldest);
    }
  }
  lastSoundByConversation.set(conversationId, Date.now());
}

/** Un beep por cada mensaje del cliente. Dedup por id para no sonar dos veces. */
export function playInboundClientMessageSound(input: {
  conversationId: string;
  messageId?: string;
}): boolean {
  if (input.messageId && recentMessageIds.has(input.messageId)) return false;
  rememberInboundSound(input.conversationId, input.messageId);
  playMessageSound();
  return true;
}

/** Respaldo por polling: no repetir si el socket ya sonó hace un momento. */
export function shouldPlayPollInboundSound(conversationId: string): boolean {
  const last = lastSoundByConversation.get(conversationId) ?? 0;
  return Date.now() - last > 2500;
}
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showMessageNotification(
  customerName: string,
  preview: string,
  conversationId: string,
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const body = preview.trim() || "Nuevo mensaje de WhatsApp";
  try {
    const n = new Notification(`Mensaje de ${customerName}`, {
      body,
      tag: `dumo-msg-${conversationId}`,
      icon: "/favicon.ico",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export function setupMessageNotificationUnlock(): () => void {
  if (typeof window === "undefined") return () => {};

  const unlock = () => {
    unlockMessageAudio();
    void requestMessageNotificationPermission();
  };

  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });

  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}
