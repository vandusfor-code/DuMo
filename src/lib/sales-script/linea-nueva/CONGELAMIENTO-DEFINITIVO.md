# ⛔ CONGELAMIENTO DEFINITIVO — Script Línea Nueva sin equipo

**Fecha de congelamiento:** 2026-08-07  
**Documento oficial recibido:** 2026-08-07  
**Estado:** `LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING = true` (motor sigue bloqueado hasta Fase 7)  
**Versión del motor:** Sin v1.0 — arquitectura únicamente  
**Fase actual:** Fase 2 ✅ SPEC oficial creado → **Fase 3** (auditoría bloque por bloque) pendiente de aprobación

---

## Estado del proyecto

```
Portabilidad
    ✅ 100% funcional

Línea Nueva
    ✅ Arquitectura creada
    ✅ Documento oficial + raw.txt (33 párrafos)
    ⛔ Contenido pendiente (implementación)
    ⛔ Auditoría pendiente (Fase 3)
    ⛔ Integración pendiente
```

---

## Qué está conservado

| Componente | Archivo | Estado |
|------------|---------|--------|
| Engine | `linea-nueva-engine.ts` | ✅ Congelado — lanza `OFFICIAL_DOCUMENT_PENDING` |
| Builder | `linea-nueva-builder.ts` | ✅ Conservado |
| Rule Engine | `linea-nueva-rules.ts` | ✅ Conservado — sin reglas comerciales |
| Context | `linea-nueva-context.ts` | ✅ Conservado — mapeo estructural |
| Renderer | `linea-nueva-renderer.ts` | ✅ Conservado |
| Registry | `sections/registry.ts` | ✅ Conservado |
| Types | `linea-nueva-types.ts` | ✅ Conservado |
| Validation | `validation/index.ts` | ✅ Conservado — mínimas |
| Bridge | `linea-nueva-bridge.ts` | ✅ Congelado — lanza `OFFICIAL_DOCUMENT_PENDING` |
| Pipeline | `sections/bloque-01` … `bloque-13` | ✅ 13 slots — todos `skip` pendiente |

---

## Qué NO existe (correcto)

- ❌ Textos aproximados, resumidos, adaptados o inferidos
- ❌ Textos reutilizados desde Portabilidad
- ❌ Builders con discurso comercial implementado
- ❌ Builders con discurso comercial
- ❌ Registro en `SCRIPT_FLOW_REGISTRY`
- ❌ Conexión UI / eligibility / saveLead
- ❌ v1.0 congelado

---

## Qué NO tocar hasta completar auditoría LN

| Área | Tocado |
|------|:------:|
| Portabilidad (motor, builders, teleprompter) | ❌ |
| `flows/registry.ts` (Portabilidad) | ❌ |
| `builder.ts` principal | ❌ |
| `eligibility.ts` | ❌ |
| UI / pestaña Script | ❌ |
| Dashboard / Admin | ❌ |

---

## Documento oficial (recibido)

| Archivo | Ubicación |
|---------|-----------|
| PDF original | `SCRIPT CIERRE 31 JULIO Línea Nueva sin Equipo.docx.pdf` (raíz) |
| Copia en source | `src/data/scripts/source/linea-nueva-sin-equipo.pdf` |
| Extracción | `src/data/scripts/source/linea-nueva-sin-equipo.raw.txt` (33 párrafos) |
| Script extracción | `scripts/extract-linea-nueva-pdf.py` |

Ninguna palabra del documento puede modificarse al extraer.

---

## Proceso post-documento (orden obligatorio)

### Fase 1 — Extracción ✅
Extraer el PDF a `.raw.txt` sin modificar ninguna palabra. **Completada** — 33 párrafos indexados `[1]`–`[33]`.

### Fase 2 — SPEC oficial ✅
Crear `src/data/scripts/SPEC-teleprompter-linea-nueva-sin-equipo.md` — **Completada** (pendiente aprobación negocio).

### Fase 3 — Auditoría bloque por bloque
Por cada bloque (1–13), documentar:

- Texto oficial
- Texto implementado
- Comparación línea por línea
- Variables
- Diferencias
- Conclusión

**No pasar al siguiente bloque hasta aprobar el anterior.**

### Fase 4 — Clasificación
Por bloque:

- **Transversal** — reutilizar builder de `teleprompter/` solo si idéntico al oficial
- **Propio Línea Nueva** — builder nuevo en `linea-nueva/sections/`

Nunca duplicar código innecesariamente.

### Fase 5 — Implementación
Implementar **únicamente** bloques aprobados.

### Fase 6 — Auditoría funcional
Validar escenarios:

- Plan W, O, M
- Domicilio, retiro tienda
- 1, 2 y 3 líneas
- Multilínea heterogénea

### Fase 7 — Congelar v1.0
Solo después de aprobar **todos** los bloques:

1. `LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING = false`
2. Registrar flujo en `SCRIPT_FLOW_REGISTRY`
3. Integrar UI (fase posterior explícita)

---

## Desbloqueo del motor

Cuando Fase 7 esté completa:

```typescript
// linea-nueva-engine.ts
export const LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING = false;
```

Hasta entonces, `buildLineaNuevaScript()` siempre lanza:

```
OFFICIAL_DOCUMENT_PENDING
```

---

## Referencias internas

| Documento | Propósito |
|-----------|-----------|
| [`LINEA_NUEVA_IMPLEMENTATION_SPEC.md`](./LINEA_NUEVA_IMPLEMENTATION_SPEC.md) | Estructura 13 bloques |
| [`PENDIENTE-DOCUMENTO-OFICIAL.md`](./PENDIENTE-DOCUMENTO-OFICIAL.md) | Guía rápida |
| [`../../data/scripts/INFORME-CONGELAMIENTO-linea-nueva.md`](../../data/scripts/INFORME-CONGELAMIENTO-linea-nueva.md) | Informe de limpieza |
| [`../../data/scripts/AUDITORIA-linea-nueva-sin-equipo.md`](../../data/scripts/AUDITORIA-linea-nueva-sin-equipo.md) | Auditoría documental (bloqueada) |
| [`../../data/scripts/SPEC-teleprompter-linea-nueva-sin-equipo.md`](../../data/scripts/SPEC-teleprompter-linea-nueva-sin-equipo.md) | SPEC oficial Fase 2 (pendiente aprobación) |

---

**No desbloquear el motor ni integrar UI hasta completar Fases 2–7 con aprobación bloque por bloque.**
