"""Extrae párrafos del documento oficial Word a raw.txt."""
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "src/data/scripts/source/portabilidad-sin-equipo.docx"
RAW = DOCX.with_suffix(".raw.txt")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

with zipfile.ZipFile(DOCX) as z:
    root = ET.fromstring(z.read("word/document.xml"))

paras = []
for p in root.iter(W + "p"):
    texts = []
    for t in p.iter(W + "t"):
        if t.text:
            texts.append(t.text)
        if t.tail:
            texts.append(t.tail)
    line = "".join(texts).strip()
    paras.append(line)

RAW.write_text("\n".join(f"[{i}] {p}" for i, p in enumerate(paras, 1)), encoding="utf-8")
print(f"Wrote {len(paras)} paragraphs to {RAW}")
