/** Normaliza a 9 dígitos nacionales chilenos para consulta SUBTEL. */
export function normalizePhoneForLookup(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("56") && digits.length >= 11) {
    digits = digits.slice(2);
  }

  if (digits.length === 8 && /^[2-9]/.test(digits)) {
    digits = `9${digits}`;
  }

  if (digits.length !== 9) return null;
  return digits;
}
