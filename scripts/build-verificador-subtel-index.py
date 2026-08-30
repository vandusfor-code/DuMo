#!/usr/bin/env python3
"""Genera índice compacto de rangos SUBTEL para el verificador DuMo."""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "documentos" / "tabla_numeracion_ido_idd_06-08-2026.xlsx"
if not XLSX.exists():
    XLSX = ROOT / "tabla_numeracion_ido_idd_06-08-2026.xlsx"
OUT = ROOT / "public" / "verificador" / "subtel-index.json"
SHEETS = ("Local - Móvil - VoIN", "SSCC")


def parse_block(block: str) -> tuple[int, int] | None:
    cleaned = re.sub(r"\s+", "", (block or "").strip().upper())
    if not cleaned or "X" not in cleaned:
        return None
    first_x = cleaned.index("X")
    prefix = cleaned[:first_x]
    x_count = len(cleaned) - first_x
    if not prefix.isdigit() or x_count <= 0:
        return None
    start = int(prefix + "0" * x_count)
    end = int(prefix + "9" * x_count)
    return start, end


def read_sheet_rows(zf: zipfile.ZipFile, sheet_path: str) -> list[tuple[str, ...]]:
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    shared: list[str] = []
    with zf.open("xl/sharedStrings.xml") as f:
        tree = ET.parse(f)
        for si in tree.findall(".//m:si", ns):
            texts = [t.text or "" for t in si.findall(".//m:t", ns)]
            shared.append("".join(texts))

    def cell_value(c) -> str:
        t = c.get("t")
        v = c.find("m:v", ns)
        if v is None or v.text is None:
            return ""
        if t == "s":
            idx = int(v.text)
            return shared[idx] if idx < len(shared) else ""
        return v.text

    rows: list[tuple[str, ...]] = []
    with zf.open(sheet_path) as f:
        tree = ET.parse(f)
        sheet_data = tree.find("m:sheetData", ns)
        if sheet_data is None:
            return rows
        for row in sheet_data.findall("m:row", ns):
            cells = row.findall("m:c", ns)
            values: list[str] = []
            for c in cells:
                ref = c.get("r", "")
                col = re.sub(r"\d+", "", ref)
                while len(values) < _col_index(col):
                    values.append("")
                values[_col_index(col) - 1] = cell_value(c)
            if values:
                rows.append(tuple(values))
    return rows


def _col_index(col: str) -> int:
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n


def main() -> None:
    if not XLSX.exists():
        raise SystemExit(f"No se encontró base SUBTEL: {XLSX}")

    with zipfile.ZipFile(XLSX) as zf:
        workbook = ET.fromstring(zf.read("xl/workbook.xml"))
        ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        rels = {
            r.attrib["Id"]: r.attrib["Target"]
            for r in ET.fromstring(zf.read("xl/_rels/workbook.xml.rels")).findall(
                "{http://schemas.openxmlformats.org/package/2006/relationships}Relationship"
            )
        }
        sheet_paths: dict[str, str] = {}
        for sh in workbook.findall(".//m:sheet", ns):
            name = sh.attrib["name"]
            rid = sh.attrib[
                "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
            ]
            target = rels[rid]
            if not target.startswith("xl/"):
                target = "xl/" + target.lstrip("/")
            sheet_paths[name] = target

        ranges: list[list[int | str]] = []
        companies: dict[str, int] = {}
        company_list: list[str] = []

        for sheet_name in SHEETS:
            path = sheet_paths.get(sheet_name)
            if not path:
                continue
            rows = read_sheet_rows(zf, path)
            if not rows:
                continue
            for row in rows[1:]:
                block = (row[0] if len(row) > 0 else "").strip()
                company = (row[4] if len(row) > 4 else "").strip()
                if not block or not company:
                    continue
                parsed = parse_block(block)
                if not parsed:
                    continue
                start, end = parsed
                if company not in companies:
                    companies[company] = len(company_list)
                    company_list.append(company)
                ranges.append([start, end, companies[company]])

    ranges.sort(key=lambda r: (r[0], r[1]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {"version": 1, "companies": company_list, "ranges": ranges}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Índice generado: {OUT} ({len(ranges)} rangos, {len(company_list)} empresas)")


if __name__ == "__main__":
    main()
