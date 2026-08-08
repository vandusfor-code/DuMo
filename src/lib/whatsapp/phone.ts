export function normalizeWhatsAppRecipient(to: string, conversationId?: string): string {
  const digits = to.replace(/\D/g, "");
  if (digits.length >= 8) return digits;
  const fallback = conversationId?.replace(/\D/g, "") ?? "";
  if (fallback.length >= 8) return fallback;
  throw new Error("Número de WhatsApp inválido.");
}

/** LID interno de WhatsApp Web (15+ dígitos) — no es un teléfono móvil real. */
export function isLikelyWhatsAppLid(digits: string): boolean {
  const d = digits.replace(/\D/g, "");
  return d.length >= 14;
}

/** Formato legible para bandeja (+57 300 123 4567). */
export function formatWhatsAppDisplayPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
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
  const digits = phone.replace(/\D/g, "");
  if (!digits) throw new Error("Destino de WhatsApp Web inválido.");
  if (isLikelyWhatsAppLid(digits)) return `${digits}@lid`;
  return `${digits}@s.whatsapp.net`;
}
