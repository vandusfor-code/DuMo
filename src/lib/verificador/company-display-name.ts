function normalizeKey(name: string): string {
  return name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function simplifyLegalName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*(S\.?A\.?|S\.?P\.?A\.?|SPA|LTDA\.?|LIMITADA|EIRL)\.?\s*$/i, "")
    .replace(/\s*,\s*.*$/, "")
    .trim();
}

/** Convierte razón social SUBTEL al nombre comercial de la compañía. */
export function toDisplayCompanyName(legalName: string): string {
  const raw = legalName.trim();
  if (!raw) return "";

  const key = normalizeKey(raw);

  if (key.includes("TELEFONICA MOVIL") || key.includes("TELEFONICA MOVIBLE")) {
    return "Movistar";
  }

  if (
    key.includes("TELEFONICA CHILE") ||
    key.includes("COMPANIA DE TELECOMUNICACIONES DE CHILE") ||
    key.includes("TELEFONICA DEL SUR") ||
    key.includes("TELEFONICA UNO UNO CUATRO") ||
    key.includes("TELEFONICA VIVA") ||
    key.includes("TELEFONICA LARGA DISTANCIA")
  ) {
    return "Movistar";
  }

  if (key.includes("CLARO")) return "Claro";

  if (
    key.includes("ENTEL") ||
    key.includes("EMPRESA NACIONAL DE TELECOMUNICACIONES")
  ) {
    return "Entel";
  }

  if (/\bWOM\b/.test(key)) return "WOM";

  if (key.includes("VIRGIN MOBILE")) return "Virgin Mobile";

  if (key.includes("VTR")) {
    return key.includes("MOVIL") ? "VTR Móvil" : "VTR";
  }

  if (key.includes("NEXTEL")) return "Nextel";

  if (key.includes("GTD")) return "GTD";

  if (key.includes("FALABELLA MOVIL")) return "Falabella Móvil";

  if (key.includes("AT&T") || key.includes("AT AND T")) return "AT&T";

  return simplifyLegalName(raw);
}
