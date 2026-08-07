# Script Línea Nueva sin equipo — Especificación de implementación

> ⛔ **Módulo congelado.** Ver [`CONGELAMIENTO-DEFINITIVO.md`](./CONGELAMIENTO-DEFINITIVO.md)

**Estado del módulo:** Congelado — documento oficial recibido, implementación pendiente  
**Documento:** `SCRIPT CIERRE 31 JULIO Línea Nueva sin Equipo.docx.pdf` → `source/linea-nueva-sin-equipo.raw.txt`  
**Flag de bloqueo:** `LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING = true`

---

## Bloques

### Bloque 1 — Introducción / Inicio
- **Estado:** ✅ **IMPLEMENTADO — CONGELADO v1.0**
- **Documento oficial:** raw `[1]` (nota asesora) + saludo transversal DuMo
- **Archivo:** `sections/bloque-01-introduccion.ts`
- **Section ID:** `introduccion`
- **Builder:** `buildBlock1SaludoSpeech` (reutilizado) + `buildLineaNuevaBloque01Introduccion`
- **Verificación:** `scripts/verify-linea-nueva-bloque-01.ts`

### Bloque 2 — Audio
- **Estado:** ✅ **IMPLEMENTADO — CONGELADO v1.0**
- **Documento oficial:** raw `[2]`–`[3]`
- **Archivo:** `sections/bloque-02-audio.ts`
- **Section ID:** `audio` *(interno LN; teleprompter global: `bloque-2` en integración)*
- **Builder:** `buildBlock2AudioSpeech` (reutilizado, sin cambios)
- **Verificación:** `scripts/verify-linea-nueva-bloque-02.ts`

### Bloque 3 — Resumen de contratación
- **Estado:** ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- **Copy verificado:** frase intro `"una línea nueva con un número nuevo (o portabilidad)"` — raw `[7]` línea 7, literal del documento oficial
- **Documento oficial:** raw `[4]`–`[8]`
- **Archivo:** `sections/bloque-03-resumen-venta.ts`
- **Section ID:** `resumen_venta`
- **Builders:** `buildContractDataValidationIntro` + `buildContractSummarySpeech(ctx, "new_line")`
- **Validación:** `sections/bloque-03-resumen-venta.validation.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-03.ts`

### Bloque 4 — Beneficios del plan
- **Estado:** ✅ **IMPLEMENTADO — CONGELADO v1.0**
- **Documento oficial:** raw `[9]`–`[12]` (referencia; discurso desde catálogo comercial)
- **Archivo:** `sections/bloque-04-beneficios.ts`
- **Section ID:** `beneficios`
- **Builder:** `buildMultilineBenefitsSpeech` → `buildBlock4BenefitsSpeech` (reutilizado, sin cambios)
- **Validación:** `sections/bloque-04-beneficios.validation.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-04.ts`

### Bloque 5 — Condiciones generales
- **Estado:** ✅ **IMPLEMENTADO — AUDITADO — VERIFICADO — CONGELADO v1.0**
- **Documento oficial:** raw `[13]`
- **Archivo:** `sections/bloque-05-condiciones.ts`
- **Section ID:** `condiciones`
- **Builder:** `buildGeneralConditionsSpeech()` (exportado desde `block5-delivery-speech.ts`, reutilizado sin cambios de texto)
- **Verificación:** `scripts/verify-linea-nueva-bloque-05.ts`

### Bloque 6 — Despacho
- **Estado:** ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- **Documento oficial:** raw `[14]`–`[18]`
- **Archivo:** `sections/bloque-06-despacho.ts`
- **Módulo:** `delivery/linea-nueva-delivery-speech.ts` (modular)
- **Section ID:** `despacho`
- **Validación:** `sections/bloque-06-despacho.validation.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-06.ts`

### Bloque 7 — Compatibilidad
- **Estado:** ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- **Documento oficial:** raw `[19]` *(raw `[20]` contratos — fuera de alcance Bloque 7)*
- **Archivo:** `sections/bloque-07-compatibilidad.ts`
- **Section ID:** `compatibilidad`
- **Builder:** `buildCompatibilidadEquiposSpeech()` (exportado desde `block5-delivery-speech.ts`)
- **Verificación:** `scripts/verify-linea-nueva-bloque-07.ts`

### Bloque 8 — Chip prepago
- **Estado:** ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- **Copy verificado:** discurso raw `[21]` — idéntico a `buildBlock7GiftSpeech()` (cuerpo hablado literal)
- **Documento oficial:** raw `[21]`
- **Archivo:** `sections/bloque-08-chip-prepago.ts`
- **Section ID:** `chip_prepago`
- **Builder:** `buildBlock7GiftSpeech({ clientFirstName })` (reutilizado, sin cambios)
- **Validación:** `sections/bloque-08-chip-prepago.validation.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-08.ts`

### Bloque 9 — Encuesta NPS
- **Estado:** ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- **Copy verificado:** discurso raw `[22]` — equivalente a `buildBlock8SurveySpeech()` (2 fases + rama `npsSurvey`)
- **Documento oficial:** raw `[22]`
- **Archivo:** `sections/bloque-09-encuesta.ts`
- **Section ID:** `encuesta`
- **Builder:** `buildBlock8SurveySpeech({ clientFirstName })` (reutilizado, sin cambios)
- **Rama:** `npsSurvey` — postQuestionSpeech + advisorNoteBeforeContinue
- **Validación:** `sections/bloque-09-encuesta.validation.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-09.ts`

### Bloque 10 — VDI
- **Estado:** ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- **Copy verificado:** raw `[23]`–`[25]` — equivalente a `buildBlock9AcceptanceSpeech()` (2 fases + ramas)
- **Documento oficial:** raw `[23]`–`[25]`
- **Archivo:** `sections/bloque-10-vdi.ts`
- **Section ID:** `vdi`
- **Builder:** `buildBlock9AcceptanceSpeech({ clientFirstName })` (reutilizado, sin cambios)
- **Ramas:** `condicionesDudas` + `acceptance` (postCondicionesSpeech + advisorNoteOnNo)
- **Validación:** `sections/bloque-10-vdi.validation.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-10.ts`

### Bloque 11 — Prefijo 809
- **Estado:** ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- **Copy verificado:** discurso raw `[27]`–`[30]` vía builder transversal; nota asesora raw `[26]` segmento LN en orquestador
- **Documento oficial:** raw `[26]`–`[31]`
- **Archivo:** `sections/bloque-11-prefijo-809.ts`
- **Section ID:** `prefijo_809`
- **Builder:** `buildBlock10Prefijo809Speech({ clientFirstName })` — reutilizado; override `advisorNoteOnBlockStart` en orquestador LN
- **Validación:** `sections/bloque-11-prefijo-809.validation.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-11.ts`

### Bloque 12 — Referido
- **Estado:** ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- **Copy verificado:** discurso raw `[32]` — idéntico a `buildBlock11ReferralSpeech()` (content literal)
- **Documento oficial:** raw `[32]`
- **Archivo:** `sections/bloque-12-referido.ts`
- **Section ID:** `referido`
- **Builder:** `buildBlock11ReferralSpeech({ clientFirstName })` (reutilizado, sin cambios)
- **Rama:** `referral.advisorNote` — nota congelada Portabilidad v1.0
- **Validación:** `sections/bloque-12-referido.validation.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-12.ts`

### Bloque 13 — Despedida
- **Estado:** ✅ **IMPLEMENTADO — CONGELADO v1.0**
- **Documento oficial:** raw `[33]`
- **Archivo:** `sections/bloque-13-despedida.ts`
- **Section ID:** `despedida`
- **Builder:** `buildBlock12FarewellSpeech({ executiveEmail, executiveName })` (reutilizado, sin cambios)
- **Validación:** `sections/bloque-13-despedida.validation.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-13.ts`

---

## Arquitectura conservada

| Componente | Archivo |
|------------|---------|
| Engine | `linea-nueva-engine.ts` |
| Builder | `linea-nueva-builder.ts` |
| Rule Engine | `linea-nueva-rules.ts` |
| Types | `linea-nueva-types.ts` |
| Context | `linea-nueva-context.ts` |
| Renderer | `linea-nueva-renderer.ts` |
| Registry | `sections/registry.ts` |
| Validaciones | `validation/index.ts` |
| Bridge | `linea-nueva-bridge.ts` |

---

## Flujo de auditoría (post-documento)

Ver fases 1–7 en [`CONGELAMIENTO-DEFINITIVO.md`](./CONGELAMIENTO-DEFINITIVO.md).

Metodología idéntica a Portabilidad Sin Equipo:

1. Extraer `.raw.txt` (sin modificar palabras)
2. Crear SPEC oficial
3. Auditar bloque por bloque (no avanzar sin aprobación)
4. Clasificar Transversal / Propio
5. Implementar solo bloques aprobados
6. Auditoría funcional (W/O/M, domicilio, tienda, multilínea)
7. Congelar v1.0

---

## Restricciones vigentes

- No implementar textos hasta completar auditoría documental
- No adaptar ni inferir desde Portabilidad
- No modificar el motor de Portabilidad
- No conectar UI, eligibility ni saveLead hasta congelar v1.0

---

*Referencia metodológica:* `src/data/scripts/SPEC-teleprompter-portabilidad-sin-equipo.md`
