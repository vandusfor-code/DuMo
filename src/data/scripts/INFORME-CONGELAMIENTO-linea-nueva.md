# Informe de congelamiento — Script Línea Nueva sin equipo

**Fecha:** 2026-08-07  
**Estado:** ⛔ **PENDIENTE DE DOCUMENTO OFICIAL**

---

## 1. Arquitectura conservada

| Componente | Archivo | Estado |
|------------|---------|--------|
| Motor | `linea-nueva-engine.ts` | ✅ Conservado — **bloqueado** |
| Builder | `linea-nueva-builder.ts` | ✅ Conservado |
| Rule Engine | `linea-nueva-rules.ts` | ✅ Conservado (sin reglas comerciales) |
| Types | `linea-nueva-types.ts` | ✅ Conservado |
| Context | `linea-nueva-context.ts` | ✅ Conservado (solo mapeo estructural) |
| Renderer | `linea-nueva-renderer.ts` | ✅ Conservado |
| Registry | `sections/registry.ts` | ✅ Conservado — 13 bloques **pendientes** |
| Validaciones | `validation/index.ts` | ✅ Conservado (mínimas) |
| Bridge | `linea-nueva-bridge.ts` | ✅ Conservado — **bloqueado** |
| API | `index.ts` | ✅ Conservado |

---

## 2. Textos eliminados

| Eliminado | Motivo |
|-----------|--------|
| `source/linea-nueva-sin-equipo.raw.txt` | Generado artificialmente (no oficial) |
| `summary/contract-resumen.ts` | Textos adaptados desde Portabilidad |
| `delivery/delivery-speech.ts` | Textos inferidos/adaptados |
| `sections/prefijo-809-speech.ts` | Copy no auditado vs oficial |
| `sections/introduccion.ts` | Copy duplicado/adaptado |
| `sections/audio.ts` | Importaba builder sin auditoría LN |
| `sections/condiciones.ts` | Texto inline no oficial |
| `sections/compatibilidad.ts` | Texto inline no oficial |
| `sections/chip-prepago.ts` | Import transversal sin auditoría LN |
| `sections/encuesta.ts` | Import transversal sin auditoría LN |
| `sections/vdi.ts` | Import transversal sin auditoría LN |
| `sections/prefijo-809.ts` | Wrapper no oficial |
| `sections/referido.ts` | Import transversal sin auditoría LN |
| `sections/despedida.ts` | Import transversal sin auditoría LN |
| `summary/index.ts`, `benefits/index.ts`, `delivery/index.ts` | Stubs con contenido |
| `scripts/verify-linea-nueva-teleprompter.ts` | Validaba implementación no oficial |
| `scripts/audit-linea-nueva-funcional.ts` | Validaba implementación no oficial |
| Reglas comerciales en `linea-nueva-rules.ts` | Implementadas sin documento oficial |
| Validaciones comerciales extendidas | Implementadas sin documento oficial |

---

## 3. Módulo congelado

- Flag: `LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING = true`
- `buildLineaNuevaScript()` lanza `OFFICIAL_DOCUMENT_PENDING`
- `buildLineaNuevaSinEquipoSteps()` lanza `OFFICIAL_DOCUMENT_PENDING`
- Los 13 bloques en registry están marcados como **skip — pendiente documento oficial**

---

## 4. Sin cambios en UI / integración

| Área | Modificado |
|------|:----------:|
| `eligibility.ts` | ❌ No |
| `builder.ts` (global) | ❌ No |
| `resolveScriptFlow()` | ❌ No (LN no enrutable) |
| `saveLeadWithScript()` | ❌ No |
| Pestaña Script | ❌ No |
| Dashboard / Admin | ❌ No |
| `SCRIPT_FLOW_REGISTRY` | ✅ LN **removido** del registro |

---

## 5. Listo para auditoría cuando llegue el documento

**Acción del usuario:** agregar `SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO.docx`

**Proceso DuMo (metodología Portabilidad):**

1. Extraer → `linea-nueva-sin-equipo.raw.txt`
2. SPEC funcional
3. Auditoría 13 bloques (línea por línea)
4. Registro transversal / propio
5. Implementación bloque a bloque con aprobación
6. Congelamiento v1.0
7. Integración UI

**Referencias en repo:**

- `src/lib/sales-script/linea-nueva/PENDIENTE-DOCUMENTO-OFICIAL.md`
- `src/data/scripts/SPEC-teleprompter-portabilidad-sin-equipo.md` (plantilla metodológica)
- `src/data/scripts/source/portabilidad-sin-equipo.raw.txt` (referencia de extracción)

---

*Ninguna funcionalidad adicional será implementada hasta incorporar el documento oficial.*
