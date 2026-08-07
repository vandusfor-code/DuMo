"""Extrae texto del PDF oficial Línea Nueva sin equipo → raw.txt."""
from __future__ import annotations

import re
import shutil
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "src/data/scripts/source"
SOURCE_DIR.mkdir(parents=True, exist_ok=True)

PDF_CANDIDATES = [
    ROOT / "SCRIPT CIERRE 31 JULIO Línea Nueva sin Equipo.docx.pdf",
    ROOT / "SCRIPT CIERRE 31 JULIO Linea Nueva sin Equipo.docx.pdf",
]

PDF_DEST = SOURCE_DIR / "linea-nueva-sin-equipo.pdf"
RAW = SOURCE_DIR / "linea-nueva-sin-equipo.raw.txt"

HEADER = (
    "SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO OFERTA CONSUMER MÓVIL CANALES "
    "TELEVENTAS Y DIGITAL SEGMENTOS DE VENTA OUTBOUND / INBOUND /C2C / WHATSAPP"
)

FOOTER_PATTERN = re.compile(
    r"Fecha de creación:.*?Fecha vigencia: \d{2}-\d{2}-\d{4}",
    re.IGNORECASE,
)

# Marcadores de párrafo del documento oficial (orden de aparición).
SECTION_SPLITS = [
    "CIERRE:",
    "Has tomado una gran decisión",
    "¿Tienes alguna duda con el audio que escuchaste?",
    "Continuamos con un breve resumen de tu contratación:",
    "Tú Nombre Completo es",
    "SI: Continuar NO: Corregir.",
    "Según las condiciones acordadas, aceptas contratar hoy",
    "En caso de PLANES MÁS señala la cantidad",
    "PARA PLANES MÁS LÍNEAS ADICIONALES:",
    "PARA PLANES MÁS CON HOMOLOGACIÓN (UPSELLING):",
    "Dependiendo del plan que lleve:",
    "PLAN SIMPLE W 150 GB:",
    "PLAN SIMPLE O 300 GB :",
    "PLAN SIMPLE M GB LIBRES:",
    "CONDICIONES GENERALES PARA TODOS LOS PLANES:",
    "CIERRE DESPACHO A DOMICILIO:",
    "CONDICION VALIDA SOLO PARA DESPACHO A DOMICILIO RECIBIENDO TITULAR O TERCERO",
    "Si el despacho es con: ALAS/SROUTE/CHILEPARCEL",
    "Si el despacho es con: NOMAD",
    "CIERRE DESPACHO EN TIENDA:",
    "COMPATIBILIDAD DE EQUIPOS:",
    "CONTRATOS Y ANEXOS:",
    "CHIP PREPAGO DE REGALO:",
    "ENCUESTA NPS:",
    "ACEPTACIÓN FINAL Y PROCESO DE VALIDACIÓN DE IDENTIDAD:",
    "Entiendes y en conjunto con iniciar ahora el proceso de Validación de identidad",
    "RESPUESTA CLIENTE : SI",
    "DESHABILITACIÓN PREFIJO 809:",
    "CLIENTE RESPONDE SÍ (Entregar contexto):",
    "CLIENTE RESPONDE NO (Entregar contexto):",
    "NO: Entiendo, de igual forma si más adelante lo deseas hacer",
    "CLIENTE CONSULTA MÁS SOBRE ESTE PROCESO (Entregar contexto):",
    "Si el cliente acepta, debes derivar la solicitud de deshabilitación vía formulario.",
    "REFERIDO:",
    "DESPEDIDA:",
]


def resolve_pdf() -> Path:
    for candidate in PDF_CANDIDATES:
        if candidate.exists():
            return candidate
    for candidate in ROOT.glob("SCRIPT CIERRE 31 JULIO*.pdf"):
        if "Portabilidad" not in candidate.name:
            return candidate
    raise FileNotFoundError("No se encontró el PDF oficial de Línea Nueva sin equipo.")


def normalize_pdf_spacing(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", " ", text)
    return text.strip()


def strip_repeated_headers(text: str) -> str:
    pattern = re.compile(re.escape(HEADER), re.IGNORECASE)
    return pattern.sub("", text).strip()


def strip_footers(text: str) -> str:
    return FOOTER_PATTERN.sub("", text).strip()


def split_by_markers(text: str) -> list[str]:
    pattern = "|".join(re.escape(marker) for marker in SECTION_SPLITS)
    parts = re.split(f"({pattern})", text)
    paras: list[str] = []
    buffer = ""

    for part in parts:
        if not part or not part.strip():
            continue
        if part in SECTION_SPLITS:
            if buffer.strip():
                paras.append(buffer.strip())
            buffer = part
        else:
            buffer += part

    if buffer.strip():
        paras.append(buffer.strip())

    return paras


def main() -> None:
    pdf_src = resolve_pdf()
    shutil.copy2(pdf_src, PDF_DEST)

    reader = PdfReader(str(pdf_src))
    pages = [(page.extract_text() or "") for page in reader.pages]
    full = normalize_pdf_spacing("\n".join(pages))
    full = strip_repeated_headers(full)
    full = strip_footers(full)
    paras = split_by_markers(full)

    RAW.write_text(
        "\n".join(f"[{i}] {p}" for i, p in enumerate(paras, 1)),
        encoding="utf-8",
    )
    print(f"Source PDF: {pdf_src}")
    print(f"Copied to: {PDF_DEST}")
    print(f"Wrote {len(paras)} paragraphs to {RAW}")


if __name__ == "__main__":
    main()
