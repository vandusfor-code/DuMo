# Script Línea Nueva sin equipo — Documento oficial recibido

> ⛔ **Motor congelado** hasta Fase 7. Ver [`CONGELAMIENTO-DEFINITIVO.md`](./CONGELAMIENTO-DEFINITIVO.md)

**Estado del módulo:** ⛔ **CONGELADO** (implementación)  
**Documento oficial:** ✅ Recibido  
**Fase 1 (extracción):** ✅ Completada  
**Fase actual:** Fase 2 — SPEC creado (pendiente aprobación) → Fase 3 auditoría bloque por bloque  
**Código:** `LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING = true` en `linea-nueva-engine.ts`

---

## Fuentes oficiales

| Archivo | Ubicación |
|---------|-----------|
| PDF | `SCRIPT CIERRE 31 JULIO Línea Nueva sin Equipo.docx.pdf` (raíz) |
| Copia | `src/data/scripts/source/linea-nueva-sin-equipo.pdf` |
| Extracción | `src/data/scripts/source/linea-nueva-sin-equipo.raw.txt` (33 párrafos) |
| Script | `scripts/extract-linea-nueva-pdf.py` |

---

## Qué está conservado (arquitectura)

```
src/lib/sales-script/linea-nueva/
├── index.ts                 → API pública
├── linea-nueva-engine.ts    → Motor (bloqueado)
├── linea-nueva-builder.ts   → Builder por secciones
├── linea-nueva-context.ts   → Adaptador gestión → contexto
├── linea-nueva-rules.ts     → Rule engine (sin reglas comerciales)
├── linea-nueva-renderer.ts  → Renderer → SalesScriptStep[]
├── linea-nueva-types.ts     → Tipos
├── linea-nueva-bridge.ts    → Puente (bloqueado)
├── validation/index.ts      → Validaciones estructurales mínimas
└── sections/registry.ts     → Pipeline 13 bloques (pendientes)
```

## Qué NO existe aún (correcto)

- ❌ Textos de discurso implementados en builders
- ❌ `SPEC-teleprompter-linea-nueva-sin-equipo.md`
- ❌ Auditoría bloque por bloque aprobada
- ❌ Registro en `SCRIPT_FLOW_REGISTRY`
- ❌ Conexión UI / eligibility / saveLead

## Próximos pasos (orden obligatorio)

1. ~~Extraer `raw.txt`~~ ✅
2. ~~Crear `SPEC-teleprompter-linea-nueva-sin-equipo.md`~~ ✅ *(pendiente aprobación)*
3. Auditar bloque a bloque (13) — comparación línea por línea
4. Identificar transversales vs propios
5. Aprobar → implementar → congelar → siguiente bloque
6. Poner `LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING = false`
7. Registrar flujo e integrar UI

---

**Referencias:**

- [`LINEA_NUEVA_IMPLEMENTATION_SPEC.md`](./LINEA_NUEVA_IMPLEMENTATION_SPEC.md) — estructura de 13 bloques
- [`../../data/scripts/SPEC-teleprompter-portabilidad-sin-equipo.md`](../../data/scripts/SPEC-teleprompter-portabilidad-sin-equipo.md) — plantilla metodológica
- [`../../data/scripts/INFORME-CONGELAMIENTO-linea-nueva.md`](../../data/scripts/INFORME-CONGELAMIENTO-linea-nueva.md)
