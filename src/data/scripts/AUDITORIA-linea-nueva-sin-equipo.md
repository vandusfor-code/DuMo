# Auditoría documental — Script Línea Nueva sin equipo

**Estado:** ⛔ **BLOQUEADA** — no se puede congelar ni conectar a UI  
**Metodología:** Igual a Portabilidad Sin Equipo / Con Equipo (análisis bloque a bloque antes de implementación)  
**Fecha:** 2026-08-07

---

## Veredicto ejecutivo

| Criterio | Estado |
|----------|--------|
| Documento oficial en repositorio | ❌ **NO EXISTE** |
| `linea-nueva-sin-equipo.raw.txt` extraído del Word | ❌ **NO EXISTE** |
| Comparación línea por línea (13 bloques) | ❌ **IMPOSIBLE** |
| Motor genera 13 bloques (validación estructural) | ✅ Ver §6 |
| Motor congelado v1.0 | ❌ **NO APROBADO** |
| Integración UI / eligibility / saveLead | ❌ **PROHIBIDA** hasta congelar |

### Documento requerido para continuar

Agregar al repositorio **exactamente** el mismo tipo de fuente que existe para Portabilidad:

| Archivo requerido | Ubicación esperada |
|-------------------|-------------------|
| Word oficial Calidad/WOM | Raíz del repo o `src/data/scripts/source/` |
| Texto extraído íntegro | `src/data/scripts/source/linea-nueva-sin-equipo.raw.txt` |

**Nombre referencial del documento:** `SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO` (según especificación del proyecto).

**Extracción:** reutilizar `scripts/extract-official-script.py` apuntando al `.docx` de Línea Nueva (mismo proceso que `portabilidad-sin-equipo.docx` → `portabilidad-sin-equipo.raw.txt`).

> ⚠️ Se eliminó `linea-nueva-sin-equipo.raw.txt` previamente generado en el repo porque **no provenía del Word oficial** — contenía textos inferidos/adaptados desde Portabilidad. Eso viola la metodología de calidad.

---

## Fuentes disponibles hoy en el repo

| Recurso | Existe | Válido para Línea Nueva |
|---------|--------|-------------------------|
| `SCRIPT CIERRE 31 JULIO Portabilidad sin Equipo dumo (1).docx` | ✅ | ❌ Flujo distinto |
| `source/portabilidad-sin-equipo.raw.txt` | ✅ | ❌ No sustituye LN |
| `SPEC-teleprompter-portabilidad-sin-equipo.md` | ✅ | ❌ Solo Portabilidad |
| `SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO` (.docx) | ❌ | — |
| `source/linea-nueva-sin-equipo.raw.txt` | ❌ | — |

---

## §4 — Registro transversal vs propio (preliminar — pendiente validación oficial)

Clasificación basada en **código actual** del motor `src/lib/sales-script/linea-nueva/`.  
La columna *¿Idéntico al oficial LN?* queda **SIN VERIFICAR** hasta tener el Word.

| # | Bloque | Transversal | Propio | Builder reutilizado | Builder nuevo / inline | Motivo |
|---|--------|:-----------:|:------:|---------------------|------------------------|--------|
| 1 | Introducción | Parcial | ✅ | ❌ No usa `buildBlock1SaludoSpeech()` | `sections/introduccion.ts` (inline) | Copy embebido; debería auditarse vs oficial LN y posiblemente unificar con Bloque 1 transversal |
| 2 | Audio | ✅ | ❌ | `buildBlock2AudioSpeech()` | — | Mismo builder congelado Portabilidad v1.0 |
| 3 | Resumen contratación | ❌ | ✅ | ❌ | `summary/contract-resumen.ts` | Texto de portabilidad adaptado a “línea nueva” — **requiere auditoría contra oficial** |
| 4 | Beneficios | ✅ | ❌ | `buildMultilineBenefitsSpeech()` → `buildBlock4BenefitsSpeech()` | — | Catálogo comercial W/O/M |
| 5 | Condiciones generales | Parcial | ✅ | ❌ | `sections/condiciones.ts` (inline) | Copy similar a Portabilidad Bloque 5 — **sin verificar vs LN** |
| 6 | Despacho | ❌ | ✅ | ❌ | `delivery/delivery-speech.ts` | Ramas domicilio/tienda propias LN — **sin verificar vs LN** |
| 7 | Compatibilidad | Parcial | ✅ | ❌ | `sections/compatibilidad.ts` (inline) | **Sin verificar vs LN** |
| 8 | Chip prepago | ✅ | ❌ | `buildBlock7GiftSpeech()` | — | Builder transversal Portabilidad |
| 9 | Encuesta NPS | ✅ | ❌ | `buildBlock8SurveySpeech()` | — | Builder transversal Portabilidad |
| 10 | VDI | ✅* | ❌ | `buildBlock9AcceptanceSpeech()` | — | *Reutilizado de Portabilidad Sin Equipo — Con Equipo tuvo divergencia; **LN puede diferir** |
| 11 | Prefijo 809 | ❌ | ✅ | ❌ No usa `buildBlock10Prefijo809Speech()` | `sections/prefijo-809-speech.ts` | Procedimiento LN (ZS + folio MAT) distinto a Portabilidad |
| 12 | Referido | ✅ | ❌ | `buildBlock11ReferralSpeech()` | — | Builder transversal Portabilidad |
| 13 | Despedida | ✅ | ❌ | `buildBlock12FarewellSpeech()` | — | Builder transversal Portabilidad |

### Builders transversales candidatos (reutilización correcta **si** el oficial LN confirma identidad)

- `buildBlock2AudioSpeech()`
- `buildMultilineBenefitsSpeech()` / `buildBlock4BenefitsSpeech()`
- `buildBlock7GiftSpeech()`
- `buildBlock8SurveySpeech()`
- `buildBlock9AcceptanceSpeech()` — **sujeto a confirmación**
- `buildBlock11ReferralSpeech()`
- `buildBlock12FarewellSpeech()`

### Builders / módulos propios obligatorios (candidatos)

- `summary/contract-resumen.ts` — resumen Línea Nueva
- `delivery/delivery-speech.ts` — despacho LN
- `sections/prefijo-809-speech.ts` — 809 LN
- `sections/introduccion.ts`, `condiciones.ts`, `compatibilidad.ts` — inline (evaluar extracción tras auditoría)

---

## §1 — Informes por bloque (estructura Portabilidad)

> En cada bloque: **Texto oficial = NO DISPONIBLE**. No se realiza comparación línea por línea hasta recibir el Word.

---

### Bloque 1 — Introducción

**Texto oficial:** ⛔ No disponible (`linea-nueva-sin-equipo.raw.txt` ausente)

**Texto implementado** (`sections/introduccion.ts`):

```
Hola, {saludo Chile}. Habla {nombre_ejecutivo} de WOM.

¿Tengo el gusto de hablar con {cliente_primer_nombre}?

Un gusto, {cliente_primer_nombre}.

Para dar continuidad a lo anteriormente conversado, te informaré las condiciones de tu contratación.
```

**Comparación línea por línea:** ⛔ BLOQUEADA

**Variables:** `saludo` (hora Chile), `nombre_ejecutivo`, `cliente_primer_nombre`

**Diferencias:** No auditable. El copy actual es **estructuralmente equivalente** al Bloque 1 transversal de Portabilidad (`buildBlock1SaludoSpeech`) pero **no está importado** — está duplicado inline.

**Conclusión:** ⛔ Requiere documento oficial LN. Evaluar reutilizar `buildBlock1SaludoSpeech()` solo si el auditor confirma identidad textual.

---

### Bloque 2 — Audio

**Texto oficial:** ⛔ No disponible

**Texto implementado:** vía `buildBlock2AudioSpeech()` (`sections/audio.ts`)

**Comparación línea por línea:** ⛔ BLOQUEADA (oficial LN vs builder congelado Portabilidad)

**Variables:** ninguna en content; rama `externalAudio`

**Diferencias:** Builder = Portabilidad Sin Equipo v1.0 congelado. Hipótesis: transversal — **sin confirmar**.

**Conclusión:** ⛔ Confirmar con Word LN antes de marcar transversal aprobado.

---

### Bloque 3 — Resumen de contratación

**Texto oficial:** ⛔ No disponible

**Texto implementado:** `summary/contract-resumen.ts` + rama `dataValidation`

Discurso fase A (validación datos) y fase B (contrato “línea nueva con el número {numero_nuevo}…”) — ver archivo fuente.

**Comparación línea por línea:** ⛔ BLOQUEADA

**Variables:** `nombre_cliente`, `rut`, `direccion_completa`, `correo`, `telefono`, `fecha_contratacion`, `numero_nuevo`, `plan`, `valor_plan`, promociones boleta $0, líneas adicionales, `total_mensual`

**Diferencias:** Implementación **adaptada desde** `contract-resumen.ts` de Portabilidad (cambia “portabilidad” por “línea nueva”, elimina disclaimer de porta). **No auditado.**

**Conclusión:** ⛔ Bloque crítico — requiere Word oficial. No congelar.

---

### Bloque 4 — Beneficios del plan

**Texto oficial:** ⛔ No disponible (beneficios dinámicos desde Oferta Comercial)

**Texto implementado:** `buildMultilineBenefitsSpeech()` → catálogo `CommercialPlan` W/O/M

**Comparación línea por línea:** ⛔ BLOQUEADA (discurso generado, no estático en Word)

**Variables:** `nombre_cliente`, `lineDetails[]` (plan, valor, tier)

**Diferencias:** Mismo mecanismo que Portabilidad Sin Equipo v1.0. Oficial LN probablemente repite instrucción “Dependiendo del plan…” — comportamiento esperado idéntico si catálogo es la misma Oferta Comercial.

**Conclusión:** ⛔ Validar instrucciones del Word LN; mecanismo de catálogo probablemente transversal.

---

### Bloque 5 — Condiciones generales

**Texto oficial:** ⛔ No disponible

**Texto implementado:** `sections/condiciones.ts` — párrafos mail bienvenida + wom.cl + App

**Comparación línea por línea:** ⛔ BLOQUEADA

**Variables:** ninguna (texto fijo)

**Diferencias:** Copy inline; muy similar a Portabilidad raw l.22 — **posible adaptación no verificada**.

**Conclusión:** ⛔ Requiere Word oficial.

---

### Bloque 6 — Despacho

**Texto oficial:** ⛔ No disponible

**Texto implementado:** `delivery/delivery-speech.ts` — rama domicilio **o** tienda

**Comparación línea por línea:** ⛔ BLOQUEADA

**Variables:** `region`, `comuna`, `direccion`, `contactPhones`, `fecha_entrega`, `nombre_sucursal`, `direccion_sucursal`, `horario_sucursal`

**Diferencias conocidas vs Portabilidad (sin verificar LN):**
- Domicilio: OTP **sin** mención a “firmar solicitud de portabilidad”
- Tienda: SMS a “número de contacto” vs “número a portar” en Portabilidad

**Conclusión:** ⛔ Bloque propio candidato — requiere Word LN.

---

### Bloque 7 — Compatibilidad

**Texto oficial:** ⛔ No disponible

**Texto implementado:** `sections/compatibilidad.ts` — URL sello multibandas + correo “Bienvenido a Wom”

**Comparación línea por línea:** ⛔ BLOQUEADA

**Variables:** ninguna (texto fijo)

**Conclusión:** ⛔ Requiere Word oficial.

---

### Bloque 8 — Chip prepago

**Texto oficial:** ⛔ No disponible

**Texto implementado:** `buildBlock7GiftSpeech()` (`sections/chip-prepago.ts`)

**Comparación línea por línea:** ⛔ BLOQUEADA

**Variables:** `clientFirstName`

**Conclusión:** ⛔ Confirmar identidad con Word LN (hipótesis: transversal con Portabilidad).

---

### Bloque 9 — Encuesta NPS

**Texto oficial:** ⛔ No disponible

**Texto implementado:** `buildBlock8SurveySpeech()` (`sections/encuesta.ts`)

**Comparación línea por línea:** ⛔ BLOQUEADA

**Variables:** `clientFirstName`; rama `npsSurvey`

**Conclusión:** ⛔ Confirmar identidad con Word LN (hipótesis: transversal).

---

### Bloque 10 — VDI (Aceptación final)

**Texto oficial:** ⛔ No disponible

**Texto implementado:** `buildBlock9AcceptanceSpeech()` — pregunta dudas + “aceptas las condiciones de **este contrato**”

**Comparación línea por línea:** ⛔ BLOQUEADA

**Variables:** `clientFirstName`; ramas `condicionesDudas`, `acceptance`

**Diferencias:** Portabilidad **Con Equipo** diverge en fase VDI; LN sin equipo podría coincidir con Sin Equipo — **sin confirmar**.

**Conclusión:** ⛔ Requiere Word oficial LN.

---

### Bloque 11 — Prefijo 809

**Texto oficial:** ⛔ No disponible

**Texto implementado:** `sections/prefijo-809-speech.ts`

- Pregunta al cliente: misma estructura que Portabilidad
- `advisorNoteOnBlockStart`: procedimiento **Línea Nueva** (número ZS + folio MAT)
- **No** usa `buildBlock10Prefijo809Speech()` (nota Portabilidad distinta)

**Comparación línea por línea:** ⛔ BLOQUEADA

**Variables:** `clientFirstName`, `numeroNuevo`, `folioMat`

**Conclusión:** ⛔ Bloque propio confirmado por diseño — requiere Word LN para congelar copy exacto.

---

### Bloque 12 — Referido

**Texto oficial:** ⛔ No disponible

**Texto implementado:** `buildBlock11ReferralSpeech()`

**Comparación línea por línea:** ⛔ BLOQUEADA

**Conclusión:** ⛔ Confirmar transversalidad con Word LN.

---

### Bloque 13 — Despedida

**Texto oficial:** ⛔ No disponible

**Texto implementado:** `buildBlock12FarewellSpeech()` — `correo_ejecutivo`, `nombre_ejecutivo`

**Comparación línea por línea:** ⛔ BLOQUEADA

**Conclusión:** ⛔ Confirmar transversalidad con Word LN.

---

## §5 — Validación funcional (estructural)

Script: `npx tsx scripts/audit-linea-nueva-funcional.ts`

Escenarios mínimos solicitados:

| Escenario | 13 bloques | Notas |
|-----------|:----------:|-------|
| Plan W — domicilio — 1 línea | ✅ | |
| Plan O — domicilio — 1 línea | ✅ | |
| Plan M — domicilio — 1 línea | ✅ | |
| Plan O — retiro tienda — 1 línea | ✅ | |
| Plan O — 2 líneas | ✅ | |
| Plan O — 3 líneas | ✅ | |
| Multilínea heterogénea O+M | ✅ | |
| Plan W + línea adicional | ✅ rechazo | Validación comercial correcta |

**Importante:** pasar la validación funcional **no** implica aprobación documental.

---

## §6 — Acciones prohibidas hasta desbloquear

- ❌ Conectar `eligibility.ts`, `saveLeadWithScript()`, `builder.ts`, `resolveScriptFlow()`
- ❌ Modificar pestaña Script / UI
- ❌ Marcar motor Línea Nueva v1.0 congelado
- ❌ Inventar, adaptar o resumir textos
- ❌ Recrear `raw.txt` sin Word oficial

## §7 — Próximos pasos (orden obligatorio)

1. **Usuario/Calidad** adjunta `SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO.docx`
2. Extraer → `source/linea-nueva-sin-equipo.raw.txt`
3. Crear `SPEC-teleprompter-linea-nueva-sin-equipo.md` (espejo de Portabilidad)
4. Auditar **13 bloques** con comparación línea por línea
5. Aprobar registro transversal/propio bloque a bloque
6. Corregir implementación donde difiera del oficial
7. Congelar v1.0 + ampliar `verify-linea-nueva-teleprompter.ts` con frases oficiales
8. **Recién entonces** integrar UI

---

*Generado como parte de la auditoría pre-congelamiento. El motor en `linea-nueva/` existe como borrador estructural — no está aprobado para producción.*
