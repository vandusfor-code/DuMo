/**
 * Convierte el documento Word oficial (.docx) en pasos estructurados.
 * Fuente: src/data/scripts/source/portabilidad-sin-equipo.docx
 * El texto extraído se guarda en portabilidad-sin-equipo.raw.txt para análisis.
 */
import fs from "node:fs";
import path from "node:path";

type ParsedSection = {
  marker: string;
  lines: string[];
};

const SECTION_MARKERS = [
  { key: "intro", match: (l: string) => /hablas con/i.test(l) && /continuidad/i.test(l) },
  { key: "validacion", match: (l: string) => /Nombre Completo es/i.test(l) },
  { key: "resumen", match: (l: string) => /Según las condiciones acordadas/i.test(l) },
  { key: "beneficios", match: (l: string) => /Dependiendo del plan que lleve/i.test(l) },
  { key: "condiciones", match: (l: string) => /^CONDICIONES GENERALES/i.test(l) },
  { key: "despacho_domicilio", match: (l: string) => /^CIERRE DESPACHO A DOMICILIO/i.test(l) },
  { key: "despacho_tienda", match: (l: string) => /^CIERRE DESPACHO EN TIENDA/i.test(l) },
  { key: "portabilidad", match: (l: string) => /^INFORMAR AL CLIENTE PARA TODA PORTABILIDAD/i.test(l) },
  { key: "cap", match: (l: string) => /^Para portabilidades de PREPAGO A POSTPAGO/i.test(l) },
  { key: "chip_prepago", match: (l: string) => /^CHIP PREPAGO DE REGALO/i.test(l) },
  { key: "encuesta", match: (l: string) => /^ENCUESTA NPS/i.test(l) },
  { key: "aceptacion", match: (l: string) => /^ACEPTACIÓN FINAL/i.test(l) || /^CIERRE:.*Cliente aceptó/i.test(l) },
  { key: "referido", match: (l: string) => /^REFERIDO:/i.test(l) },
  { key: "despedida", match: (l: string) => /^DESPEDIDA:/i.test(l) },
];

/** Lee párrafos pre-extraídos del documento oficial. */
export function extractDocxParagraphs(docxPath: string): string[] {
  const rawPath = docxPath.replace(/\.docx$/i, ".raw.txt");
  if (!fs.existsSync(rawPath)) return [];
  return fs
    .readFileSync(rawPath, "utf8")
    .split("\n")
    .map((line) => line.replace(/^\[\d+\]\s*/, "").trim())
    .filter(Boolean);
}

/** Agrupa párrafos del documento oficial por sección identificada automáticamente. */
export function parseOfficialDocument(paragraphs: string[]): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const line of paragraphs) {
    const marker = SECTION_MARKERS.find((m) => m.match(line));
    if (marker) {
      if (current) sections.push(current);
      current = { marker: marker.key, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

export function getOfficialDocxPath(): string {
  return path.join(process.cwd(), "src/data/scripts/source/portabilidad-sin-equipo.docx");
}
