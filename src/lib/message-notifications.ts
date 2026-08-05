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

function tone(freq: number, start: number, duration: number) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.start(start);
  osc.stop(start + duration);
}

/** Sonido corto de mensaje nuevo (dos tonos). */
export function playMessageSound(): void {
  if (typeof window === "undefined") return;
  unlockMessageAudio();
  if (!audioCtx || !audioUnlocked) return;
  try {
    const t = audioCtx.currentTime;
    tone(880, t, 0.11);
    tone(1174, t + 0.13, 0.14);
  } catch {
    /* ignore */
  }
}

export async function requestMessageNotificationPermission(): Promise<boolean> {
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
