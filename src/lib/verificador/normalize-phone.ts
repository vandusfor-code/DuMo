/** Normaliza a 9 dígitos nacionales chilenos para consulta SUBTEL. */
export function normalizePhoneForLookup(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  const originalLength = digits.length;

  // Código de país Chile (+56 / 569…): quitar 56 en formatos internacionales.
  if (digits.startsWith("56") && digits.length >= 10) {
    digits = digits.slice(2);
  }

  if (digits.length === 9) {
    return digits;
  }

  // Algunas bases exportan móvil internacional de 10 dígitos (56 + 8) sin el último dígito.
  if (
    originalLength === 10 &&
    digits.length === 8 &&
    digits.startsWith("9")
  ) {
    return `${digits}0`;
  }

  // Móvil local sin el 9 inicial (8 dígitos).
  if (digits.length === 8 && /^[2-8]/.test(digits)) {
    return `9${digits}`;
  }

  return null;
}
