/** Normaliza número para WhatsApp Cloud API (solo dígitos, sin + ni espacios). */
export function normalizeWhatsAppRecipient(to: string, conversationId?: string): string {
  const digits = to.replace(/\D/g, "");
  if (digits.length >= 8) return digits;
  const fallback = conversationId?.replace(/\D/g, "") ?? "";
  if (fallback.length >= 8) return fallback;
  throw new Error("Número de WhatsApp inválido.");
}
