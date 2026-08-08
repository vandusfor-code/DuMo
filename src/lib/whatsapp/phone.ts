export function normalizeWhatsAppRecipient(to: string, conversationId?: string): string {
  const digits = normalizeWhatsAppPhoneDigits(to);
  if (digits.length >= 8) return digits;
  const fallback = normalizeWhatsAppPhoneDigits(conversationId ?? "");
  if (fallback.length >= 8) return fallback;
  throw new Error("Número de WhatsApp inválido.");
}

/**
 * Teléfono real desde JID Baileys o dígitos guardados.
 * 573148127388:11@s.whatsapp.net → 573148127388 (el :11 es dispositivo, NO es parte del número).
 */
export function parseBaileysPhoneDigits(jidOrDigits: string): string {
  const raw = jidOrDigits.trim();
  if (!raw) return "";
  const user = raw.includes("@") ? (raw.split("@")[0] ?? "") : raw;
  const local = user.split(":")[0] ?? user;
  return local.replace(/\D/g, "");
}

/** Corrige números ya guardados con el sufijo :11 pegado (14 dígitos CO). */
export function normalizeWhatsAppPhoneDigits(raw: string): string {
  let d = parseBaileysPhoneDigits(raw);
  if (d.length === 14 && d.startsWith("57")) d = d.slice(0, 12);
  if (d.length === 13 && d.startsWith("56")) d = d.slice(0, 11);
  return d;
}

/** LID interno de WhatsApp Web (15+ dígitos) — no es un teléfono móvil real. */
export function isLikelyWhatsAppLid(digits: string): boolean {
  const d = normalizeWhatsAppPhoneDigits(digits);
  return d.length >= 15;
}

/** Formato legible para bandeja (+57 300 123 4567). */
export function formatWhatsAppDisplayPhone(raw: string): string {
  const d = normalizeWhatsAppPhoneDigits(raw);
  if (!d || isLikelyWhatsAppLid(d)) return "";
  if (d.length === 12 && d.startsWith("57")) {
    return `+57 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  }
  if (d.length === 11 && d.startsWith("56")) {
    return `+56 ${d.slice(2, 3)} ${d.slice(3)}`;
  }
  if (d.length === 10 && d.startsWith("3")) {
    return `+57 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  if (d.length >= 10) return `+${d}`;
  return d;
}

/** JID de destino para WhatsApp Web (Baileys): @lid si es identificador interno. */
export function resolveWhatsAppWebSendJid(phone: string, waChatJid?: string | null): string {
  if (waChatJid?.includes("@")) return waChatJid.trim();
  const digits = normalizeWhatsAppPhoneDigits(phone);
  if (!digits) throw new Error("Destino de WhatsApp Web inválido.");
  if (isLikelyWhatsAppLid(digits)) return `${digits}@lid`;
  return `${digits}@s.whatsapp.net`;
}
