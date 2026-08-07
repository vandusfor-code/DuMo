# Especificación funcional — Teleprompter Script de Cierre
## Línea Nueva sin Equipo (vigente)

**Estado:** Revisión final — **pendiente aprobación negocio. NO implementar código.**  
**Fase:** 2 cerrada — auditoría documental completa  
**Metodología:** Idéntica a Portabilidad Sin Equipo  

**Fuentes únicas:**
- `SCRIPT CIERRE 31 JULIO Línea Nueva sin Equipo.docx.pdf` → `source/linea-nueva-sin-equipo.raw.txt` (33 párrafos)
- Oferta Comercial Julio 2026 → catálogo `CommercialPlan`
- Motor Portabilidad congelado v1.0 → `src/lib/sales-script/teleprompter/`

**Principio rector:** **NO duplicar código.** Reutilizar builders transversales. Adaptar solo donde el documento oficial o la composición UI exijan cambio concreto documentado en este SPEC.

---

## 1. Mapa de clasificación definitivo

| Bloque LN | Nombre | Clasificación | Builder Portabilidad |
|-----------|--------|:-------------:|----------------------|
| 1 | Introducción / Inicio | ✅ **IMPLEMENTADO — CONGELADO v1.0** | `buildBlock1SaludoSpeech` + nota raw `[1]` |
| 2 | Audio | ✅ **IMPLEMENTADO — CONGELADO v1.0** | `buildBlock2AudioSpeech` |
| 3 | Resumen contratación | ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0** | `contract-resumen.ts` mode `new_line` |
| 4 | Beneficios | ✅ **IMPLEMENTADO — CONGELADO v1.0** | `buildMultilineBenefitsSpeech` |
| 5 | Condiciones generales | ✅ **IMPLEMENTADO — AUDITADO — VERIFICADO — CONGELADO v1.0** | `buildGeneralConditionsSpeech` *(exportado)* |
| 6 | Despacho | ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0** | `linea-nueva-delivery-speech.ts` (modular) |
| 7 | Compatibilidad | ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0** | `buildCompatibilidadEquiposSpeech` *(exportado)* |
| 8 | Chip prepago | ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0** | `buildBlock7GiftSpeech` |
| 9 | Encuesta NPS | ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0** | `buildBlock8SurveySpeech` |
| 10 | VDI | ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0** | `buildBlock9AcceptanceSpeech` |
| 11 | Prefijo 809 | ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0** | `buildBlock10Prefijo809Speech` + override nota LN |
| 12 | Referido | ✅ **IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0** | `buildBlock11ReferralSpeech` |
| 13 | Despedida | ✅ **IMPLEMENTADO — CONGELADO v1.0** | `buildBlock12FarewellSpeech` |

**Conteo:** 9 REUTILIZAR · 4 ADAPTAR · 0 NUEVO (sin builder propio)

**Bloque Portabilidad ausente en LN (correcto — no implementar):**
- Bloque 6 Proceso de portabilidad + CAP (`buildBlock6PortabilitySpeech`)

---

## 2. Tabla maestra — Bloques ADAPTAR

Cambios exactos requeridos. Sin descripciones genéricas.

| Builder existente | Cambio requerido | Motivo |
|-------------------|------------------|--------|
| `buildBlock1SaludoSpeech` | Agregar `advisorNoteOnBlockStart` opcional en metadata del step LN: *"Cliente aceptó? Comienza con el cierre indicando lo siguiente"* (raw `[1]`, categoría C) | Documento LN incluye instrucción previa al audio; en Portabilidad no se expone. **El discurso del saludo no cambia.** |
| `buildContractDataValidationIntro` | Sin cambio de texto — reutilizar tal cual | Raw `[4]`–`[5]` idéntico a Portabilidad |
| `buildContractSummarySpeech` | Sustituir plantilla monolínea: *"línea nueva con un número nuevo (o portabilidad)"* en lugar de *"portabilidad de tu número X proveniente de compañía Y"* | Documento oficial raw `[7]` |
| `buildContractSummarySpeech` | Eliminar párrafo `PORTABILITY_DISCLAIMER` (*"si el número no se porta…"*) | No existe en documento LN |
| `buildContractSummarySpeech` | Cambiar *"valor transparente"* → *"valor mensual"* / *"valor real del plan"* en textos multilínea | Documento oficial raw `[7]` |
| `buildContractSummarySpeech` | Ajustar sufijo promociones: *"boletas en $0, la vigencia y meses en que aplica"* (sin referencia 3ª/6ª boleta portabilidad) | Documento oficial raw `[7]` |
| `buildUpsellingSpeech` | Cambiar cierre: *"ganarás todos los beneficios de tu nuevo Plan Simple"* en lugar de *"beneficios obtenidos con este nuevo plan"* | Documento oficial raw `[8]` |
| `contract-resumen.ts` | Agregar parámetro `saleType: 'portability' \| 'new_line'` (o contexto equivalente) para seleccionar plantillas | Evitar duplicar archivo; un solo motor |
| `buildGeneralConditionsSpeech` | **Exportar** función hoy `private` en `block5-delivery-speech.ts` — **sin cambiar el string** | LN Bloque 5 es pantalla separada; Portabilidad la incluye dentro del Bloque 5 combinado |
| `buildBlock5DeliverySpeech` | **No reutilizar** el builder completo para LN | Incluye condiciones + despacho + compatibilidad + contratos — composición incompatible |
| `buildHomeDeliverySpeech` | **No reutilizar** — reemplazar párrafo OTP portabilidad por ramas carrier LN | Documento oficial raw `[16]`–`[17]` |
| `block5-delivery-speech.ts` | Crear `buildLineaNuevaHomeDeliverySpeech(input)` con base compartida (dirección + contacto + fecha + correo "Tu Compra va en Camino") + rama `ALAS/SROUTE/CHILEPARCEL` (cédula) **o** `NOMAD` (OTP WhatsApp) | Documento oficial raw `[14]`–`[17]` |
| `buildStorePickupSpeech` | Crear `buildLineaNuevaStorePickupSpeech(input)`: código en **correo** *"Listo para tu retiro"*, eliminar *"SMS a tu número a portar"* | Documento oficial raw `[18]` vs Portabilidad raw `[32]` |
| `buildPostDeliveryClosingSpeech` | **Exportar** `buildCompatibilidadEquiposSpeech()` — primer párrafo, **sin cambiar texto** | LN Bloque 7 es pantalla aislada; hoy solo invocable dentro del Bloque 5 Portabilidad |
| `buildPostDeliveryClosingSpeech` | **Exportar** `buildContratosAnexosSpeech()` — segundo párrafo, **sin cambiar texto** | Raw `[20]` LN ≡ raw `[36]` Portabilidad; composición pendiente (ver §7) |
| `buildBlock10Prefijo809Speech` | Parametrizar `advisorNoteOnBlockStart`: LN = *"Tomar número desde orden ZS + folio MAT → derivar formulario"*; Portabilidad = *"Ingresar número a portar al formulario"* | Documento oficial raw `[26]` |
| `buildBlock10Prefijo809Speech` | Discurso al cliente (pregunta + ramas SÍ/NO/consulta): **sin cambios** | Raw `[27]`–`[30]` LN ≡ raw `[69]`–`[73]` Portabilidad |

---

## 3. Tabla maestra — Bloques REUTILIZAR

Solo builders invocables **sin modificar su lógica interna ni su output de discurso**.

| Bloque LN | Archivo | Función | Parámetros | ¿Variante "Línea Nueva"? |
|-----------|---------|---------|------------|:------------------------:|
| 1 Inicio | `teleprompter/block1-saludo-speech.ts` | `buildBlock1SaludoSpeech(ctx)` | `ScriptBuildContext` → usa `ctx.vars.saludo`, `nombre_ejecutivo`, `nombre_cliente`, `cliente_primer_nombre` | **No** — builder transversal congelado v1.0. Nota asesora raw `[1]` se agrega en **orquestador LN**, no en el builder. |
| 2 Audio | `teleprompter/block2-audio-speech.ts` | `buildBlock2AudioSpeech()` | Sin parámetros. Retorna `{ content, branch }` con rama `externalAudio`. | **No** — builder transversal. Output idéntico a raw `[2]`–`[3]` LN. |
| 4 Beneficios | `teleprompter/speech-builders.ts` → `plan-benefits-speech.ts` | `buildMultilineBenefitsSpeech(clientName, lineDetails)` → `buildBlock4BenefitsSpeech` | `clientName: string`, `lineDetails: LineSpeechDetail[]` | **No** — catálogo comercial. Raw `[10]`–`[12]` LN es referencia; fuente = `CommercialPlan`. |
| 5 Condiciones | `teleprompter/block5-delivery-speech.ts` | `buildGeneralConditionsSpeech()` *(exportar)* | Sin parámetros | **No** — string idéntico raw `[13]` LN ≡ raw `[22]` Portabilidad. |
| 8 Chip prepago | `teleprompter/block7-gift-speech.ts` | `buildBlock7GiftSpeech({ clientFirstName })` | `clientFirstName: string` | **No** — transversal. Raw `[21]` LN ≡ raw `[54]` Portabilidad. |
| 9 Encuesta | `teleprompter/block8-survey-speech.ts` | `buildBlock8SurveySpeech({ clientFirstName })` | `clientFirstName: string`. Retorna `{ content, branch }` con rama `npsSurvey`. | **No** — transversal. Raw `[22]` LN ≡ raw `[57]` Portabilidad. |
| 10 VDI | `teleprompter/block9-acceptance-speech.ts` | `buildBlock9AcceptanceSpeech({ clientFirstName })` | `clientFirstName: string`. Retorna `{ content, branch }` con ramas `condicionesDudas` + `acceptance`. | **No** — transversal. Raw `[23]`–`[25]` LN ≡ raw `[60]`–`[65]` Portabilidad. |
| 12 Referido | `teleprompter/block11-referral-speech.ts` | `buildBlock11ReferralSpeech({ clientFirstName })` | `clientFirstName: string`. Retorna `{ content, branch }` con `referral.advisorNote`. | **No** — transversal. Raw `[32]` LN ≡ raw `[76]` Portabilidad. |
| 13 Despedida | `teleprompter/block12-farewell-speech.ts` | `buildBlock12FarewellSpeech({ executiveEmail, executiveName })` | `executiveEmail: string`, `executiveName: string` | **No** — transversal. Raw `[33]` LN ≡ raw `[78]`–`[81]` Portabilidad. |

---

## 4. Bloque 1 — Análisis técnico definitivo (Introducción / Inicio)

### 4.1 Párrafos del RAW LN
`[1]` — único párrafo asignado al slot arquitectónico "introduccion":
```
CIERRE: Cliente aceptó? Comienza con el cierre indicando lo siguiente:
```
**Categoría:** C — Instrucción interna. No es discurso.

### 4.2 Cómo funciona hoy Portabilidad

| Aspecto | Implementación actual |
|---------|----------------------|
| Orquestador | `teleprompter/blocks.ts` → step `bloque-1`, label `"Inicio"` |
| Builder | `buildBlock1SaludoSpeech(ctx)` en `block1-saludo-speech.ts` |
| Documentación | `TELEPROMPTER_ENGINE.md`: Bloque 1 **transversal** — Sin Equipo, Con Equipo |
| Raw Portabilidad | `[2]` contiene plantilla de saludo; DuMo **normalizó** el texto en builder congelado v1.0 |
| Variables | `saludo` (hora Chile vía `chileSaludoCompleto()`), `nombre_ejecutivo`, `cliente_primer_nombre` |
| Discurso generado | Saludo + identificación + continuidad antes del audio legal |

**Conclusión Portabilidad:** DuMo **ya agregó** pantalla inicial por experiencia del asesor, aunque el PDF mezcla instrucciones y discurso. El Bloque 1 no es una transcripción literal del Word — es una **decisión de producto congelada**.

### 4.3 ¿Por qué NO omitir Bloque 1 en Línea Nueva?

| Criterio | Análisis |
|----------|----------|
| Experiencia asesor | Misma llamada outbound/inbound: identificar titular, confirmar continuidad, transición al cierre legal. Aplica igual en LN. |
| Arquitectura DuMo | `block1-saludo-speech.ts` declarado **transversal para todos los flujos comerciales**. Con Equipo ya lo reutiliza sin variantes. |
| Texto del builder | Agnóstico al tipo de venta — no menciona portabilidad ni línea nueva. |
| Raw `[1]` LN | No sustituye al saludo — es gate de negocio (*"Cliente aceptó?"*) previo al audio. Equivalente a instrucción C, no a ausencia de pantalla. |
| Riesgo de omitir | Asesora LN entraría directo al audio legal sin transición; inconsistente con Portabilidad y con flujos Con Equipo. |

### 4.4 Decisión definitiva Bloque 1

| Clasificación | ✅ **REUTILIZAR** |
|---------------|-------------------|
| Builder | `buildBlock1SaludoSpeech(ctx)` — sin modificar |
| Composición LN | Step `bloque-1` / label `"Inicio"` — igual que Portabilidad |
| Instrucción raw `[1]` | `advisorNoteOnBlockStart` en metadata del step (categoría C) — **no** en el discurso |
| Variante LN en builder | **No requerida** |

**No omitir** la pantalla inicial. La ausencia de saludo en el PDF LN **no es justificación técnica** para eliminar Bloque 1 — Portabilidad demostró que DuMo separa instrucciones internas (C) de pantallas de experiencia (A).

---

## 5. Bloque 7 — Comparación línea por línea (Compatibilidad)

### 5.1 Alcance
Solo raw `[19]` — COMPATIBILIDAD DE EQUIPOS.  
Raw `[20]` CONTRATOS Y ANEXOS se documenta en §5.4 (mismo builder compuesto, misma conclusión de exportación).

### 5.2 Comparación textual — Compatibilidad

| # | Fuente | Texto |
|---|--------|-------|
| A | LN raw `[19]` | `COMPATIBILIDAD DE EQUIPOS: Te recuerdo que puedes revisar la compatibilidad de tu equipo en nuestra web https://www.wom.cl/sello-multibandas/` |
| B | Portabilidad raw `[34]` | `COMPATIBILIDAD DE EQUIPOS: Te recuerdo que puedes revisar la compatibilidad de tu equipo en nuestra web https://www.wom.cl/sello-multibandas/` |
| C | Implementado `block5-delivery-speech.ts` | `Te recuerdo que puedes revisar la compatibilidad de tu equipo en nuestra web https://www.wom.cl/sello-multibandas/` |

| Elemento | ¿Idéntico? | Notas |
|----------|:----------:|-------|
| Encabezado `COMPATIBILIDAD DE EQUIPOS:` | Sí en raw; **No se lee** | Título UI / categoría C — DuMo usa `sectionLabel: "Compatibilidad"` |
| Oración de discurso | **Sí — 100% carácter por carácter** | Sin diferencias |
| URL | **Sí** | `https://www.wom.cl/sello-multibandas/` |
| Condiciones / ramas | **Ninguna** | Siempre se incluye en flujo sin equipo |
| Variables dinámicas | **Ninguna** | Texto estático |

**Veredicto textual:** El discurso pronunciable es **idéntico** entre LN y Portabilidad.

### 5.3 Comparación funcional — ¿Por qué ADAPTAR y no REUTILIZAR?

| Aspecto | Portabilidad | Línea Nueva |
|---------|--------------|-------------|
| Pantalla UI | Compatibilidad **dentro** del Bloque 5 "Entrega" | Bloque 7 **pantalla separada** |
| Builder invocable hoy | Solo vía `buildBlock5DeliverySpeech()` → incluye condiciones + despacho + compatibilidad + contratos | No existe API pública para **solo** compatibilidad |
| Invocar `buildBlock5DeliverySpeech` en LN Bloque 7 | ❌ Incorrecto — mostraría condiciones y despacho duplicados | — |
| Invocar `buildPostDeliveryClosingSpeech` en LN Bloque 7 | ❌ Incorrecto — incluiría también contratos y anexos | — |

**Veredicto funcional:** El **texto** no cambia, pero el **builder público actual no puede usarse sin modificar absolutamente nada** (no hay función exportada de un solo párrafo).

### 5.4 Comparación — Contratos y anexos (raw `[20]`)

| Fuente | Texto (sin encabezado) |
|--------|------------------------|
| LN raw `[20]` | `Una vez que recibas tus productos te enviaremos un correo llamado "Bienvenido a Wom" con documentos adjuntos…` |
| Portabilidad raw `[36]` | Idéntico |
| Implementado (2º párrafo de `buildPostDeliveryClosingSpeech`) | Idéntico |

**Decisión composición (pendiente aprobación negocio):**
- **Opción A (recomendada):** Bloque 7 = compatibilidad + contratos (2 párrafos), exportando ambas sub-funciones — replica contenido post-entrega de Portabilidad en pantalla LN dedicada.
- **Opción B:** Bloque 7 = solo compatibilidad; contratos al final del Bloque 6.

En ambas opciones: **exportar**, no reescribir strings.

### 5.5 Clasificación definitiva Bloque 7

| Clasificación | 🔄 **ADAPTAR** |
|---------------|----------------|
| Motivo | Exportar sub-funciones desde `block5-delivery-speech.ts` — **texto sin cambios** |
| Cambio en builder | `export function buildCompatibilidadEquiposSpeech(): string` |
| Cambio en builder | `export function buildContratosAnexosSpeech(): string` *(si Opción A)* |
| Variante LN en texto | **No** |
| Regresión Portabilidad | Output de `buildBlock5DeliverySpeech` **no debe cambiar** — solo refactor de extracción |

---

## 6. Auditoría por bloque (referencia rápida)

### Bloque 1 — Introducción / Inicio ✅ IMPLEMENTADO — CONGELADO v1.0

- **Implementado:** `sections/bloque-01-introduccion.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-01.ts`
- **RAW LN:** `[1]` instrucción → `branch.inicio.advisorNoteOnBlockStart`; discurso = builder transversal
- **Builder:** `buildBlock1SaludoSpeech(ctx)` vía `linea-nueva-teleprompter-adapter.ts`
- **Diferencia vs Portabilidad:** nota asesora LN raw `[1]` en rama `inicio` (Portabilidad no la expone)

### Bloque 2 — Audio ✅ IMPLEMENTADO — CONGELADO v1.0

- **Implementado:** `sections/bloque-02-audio.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-02.ts`
- **RAW:** `[2]`–`[3]` — discurso + pregunta post-audio; instrucción `[3]` cubierta por `advisorNoteOnYes`
- **Builder:** `buildBlock2AudioSpeech()` — sin parámetros, sin variante LN
- **Comparación Portabilidad:** contenido y rama `externalAudio` **idénticos** a `bloque-2`

### Bloque 3 — Resumen contratación ✅ IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0

- **Implementado:** `sections/bloque-03-resumen-venta.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-03.ts`
- **RAW:** `[4]`–`[8]`
- **Parte A:** `buildContractDataValidationIntro` — reutilizado sin cambios
- **Parte B:** `buildContractSummarySpeech(ctx, "new_line")` — variante en `contract-resumen.ts`
- **Validaciones:** cliente, plan, correo, teléfono, ejecutivo, líneas

### Bloque 4 — Beneficios ✅ IMPLEMENTADO — CONGELADO v1.0

- **Implementado:** `sections/bloque-04-beneficios.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-04.ts`
- **RAW:** `[9]`–`[12]` (referencia documental; discurso generado desde catálogo comercial)
- **Builder:** `buildMultilineBenefitsSpeech(nombre_cliente, lineDetails)` — reutilizado sin cambios
- **Validaciones:** cliente, plan, líneas, resolución catálogo

### Bloque 5 — Condiciones generales ✅ IMPLEMENTADO — CONGELADO v1.0

- **Implementado:** `sections/bloque-05-condiciones.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-05.ts`
- **RAW:** `[13]` — idéntico a Portabilidad raw `[22]`
- **Builder:** `buildGeneralConditionsSpeech()` — exportado, string sin cambios
- **Nota:** texto estático; no depende de variables de gestión ni de `saleType`

### Bloque 6 — Despacho ✅ IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0

- **Implementado:** `sections/bloque-06-despacho.ts` + `delivery/linea-nueva-delivery-speech.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-06.ts`
- **RAW:** `[14]`–`[18]`
- **Arquitectura:** modular por carrier (ALAS/SROUTE/CHILEPARCEL cédula · NOMAD OTP WhatsApp · tienda correo)
- **No reutiliza:** `buildBlock5DeliverySpeech` (Portabilidad combina condiciones + despacho + cierres)
- **Reutiliza:** `formatHomeDeliveryAddress`, `formatContactPhones` (exportados)
- **Validaciones:** tipo entrega, dirección, teléfono, carrier, sucursal, fecha

### Bloque 7 — Compatibilidad ✅ IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0

- **Implementado:** `sections/bloque-07-compatibilidad.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-07.ts`
- **RAW:** `[19]` — discurso idéntico Portabilidad raw `[34]`
- **Builder:** `buildCompatibilidadEquiposSpeech()` — exportado, string sin cambios
- **Alcance:** solo compatibilidad; raw `[20]` contratos/anexos queda para bloque futuro
- **Nota:** encabezado `COMPATIBILIDAD DE EQUIPOS:` es label UI — no se lee al cliente

### Bloque 8 — Chip prepago ✅ IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0

- **Implementado:** `sections/bloque-08-chip-prepago.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-08.ts`
- **RAW:** `[21]` — discurso idéntico Portabilidad raw `[54]`
- **Builder:** `buildBlock7GiftSpeech({ clientFirstName })` — reutilizado, string sin cambios
- **Auditoría documental:** cuerpo hablado literal confirmado; encabezado y placeholder excluidos del speech
- **Primer nombre:** mismo criterio Portabilidad (`cliente_primer_nombre` = primer token de `customerName`)

### Bloque 9 — Encuesta NPS ✅ IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0

- **Implementado:** `sections/bloque-09-encuesta.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-09.ts` — 62/62 ✅
- **RAW:** `[22]` — discurso equivalente Portabilidad raw `[56]`–`[57]`
- **Builder:** `buildBlock8SurveySpeech({ clientFirstName })` — reutilizado, string y rama sin cambios
- **Auditoría documental:** copy conforme; diferencias Word/tildes/mayúsculas ya congeladas en Portabilidad v1.0
- **Rama:** `npsSurvey.postQuestionSpeech` (fase 2 tras respuesta favorable del cliente)
- **Nota asesora:** `npsSurvey.advisorNoteBeforeContinue` — no se lee al cliente
- **Excluido del speech:** encabezado `ENCUESTA NPS:`, nota raw, placeholder `XXX (Nombre Cliente)`, marcador `(Cliente responde bien):`

### Bloque 10 — VDI ✅ IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0

- **Implementado:** `sections/bloque-10-vdi.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-10.ts` — 79/79 ✅
- **RAW:** `[23]`–`[25]` — discurso equivalente Portabilidad raw `[58]`–`[65]`
- **Builder:** `buildBlock9AcceptanceSpeech({ clientFirstName })` — reutilizado, string y ramas sin cambios
- **Auditoría documental:** preguntas fase 1 y fase 2 literales; instrucciones flujo excluidas del speech
- **Fase 1 (`content`):** `{Nombre}, ¿te queda alguna duda con las condiciones entregadas?`
- **Fase 2 (`acceptance.postCondicionesSpeech`):** pregunta VDI raw `[24]` — palabra por palabra
- **Ramas:** `condicionesDudas.advisorNoteOnYes` · `acceptance.advisorNoteOnNo` — notas asesora, no speech
- **Excluido del speech:** encabezado `[23]`, placeholder, `SI: Aclarar dudas / No:…`, `RESPUESTA CLIENTE`

### Bloque 11 — Prefijo 809 ✅ IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0

- **Implementado:** `sections/bloque-11-prefijo-809.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-11.ts` — 99/99 ✅
- **Regresión Portabilidad:** `scripts/verify-teleprompter.ts` — ✅
- **RAW:** `[26]`–`[31]`
- **Builder:** `buildBlock10Prefijo809Speech({ clientFirstName })` — strings transversales sin cambios
- **Adaptación LN:** override `advisorNoteOnBlockStart` = segmento literal raw `[26]` (instrucción línea nueva ZS/MAT/formulario)
- **Discurso cliente:** raw `[27]`–`[30]` — idéntico Portabilidad via builder
- **Excluido del speech:** encabezado, placeholder, nota portabilidad, regla SÍ explícito, etiquetas de rama

### Bloque 12 — Referido ✅ IMPLEMENTADO — AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0

- **Implementado:** `sections/bloque-12-referido.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-12.ts` — 62/62 ✅
- **Regresión Portabilidad:** `scripts/verify-teleprompter.ts` — ✅
- **RAW:** `[32]` — idéntico Portabilidad raw `[76]`
- **Builder:** `buildBlock11ReferralSpeech({ clientFirstName })` — reutilizado, strings sin cambios
- **Discurso cliente:** literal raw (sin encabezado, placeholder ni parentético)
- **Nota asesora:** `Solicita nombre y teléfono del referido.` — congelada Portabilidad v1.0

### Bloque 13 — Despedida ✅ IMPLEMENTADO — CONGELADO v1.0

- **Implementado:** `sections/bloque-13-despedida.ts`
- **Verificación:** `scripts/verify-linea-nueva-bloque-13.ts` — 46/46 ✅
- **Regresión Portabilidad:** `scripts/verify-teleprompter.ts` — ✅
- **RAW:** `[33]`
- **Builder:** `buildBlock12FarewellSpeech({ executiveEmail, executiveName })` — reutilizado, sin cambios

---

## 7. Variables globales Línea Nueva

| Variable | Origen | Bloques |
|----------|--------|---------|
| `nombre_cliente`, `cliente_primer_nombre` | Gestión | 1, 3, 4, 8–13 |
| `saludo` | Hora Chile | 1 |
| `nombre_ejecutivo`, `correo_ejecutivo` | Sesión | 1, 13 |
| `rut`, `correo`, `telefono`, `direccion_completa` | Gestión | 3 |
| `fecha_contratacion`, `fecha_entrega` | Sistema | 3, 6 |
| `lineDetails[]`, `totalMonthly` | Catálogo + gestión | 3, 4 |
| `deliveryIsHome`, `deliveryIsStore` | Gestión | 6 |
| `carrier_despacho` | Gestión logística *(nuevo)* | 6 |
| `region`, `comuna`, `direccion`, `contactPhones[]` | Gestión | 6 |
| `nombre_sucursal`, `direccion_sucursal`, `horario_sucursal` | Config tienda | 6 |
| `numero_nuevo`, `folio_mat` | ZS / MAT *(nota asesora)* | 11 |
| `is_upselling` | Flag gestión | 3 |

---

## 8. Motor de reglas Línea Nueva

```
tipo_venta = new_line ∧ sin_equipo
├── Bloque 1: saludo transversal (igual Portabilidad)
├── Bloque 2: audio transversal
├── Bloque 3: resumen LN (plantillas adaptadas)
├── Bloque 4: beneficios catálogo
├── Bloque 5: condiciones generales (export)
├── Bloque 6: despacho
│   ├── home + ALAS|SROUTE|CHILEPARCEL → cédula
│   ├── home + NOMAD → OTP WhatsApp
│   └── store → correo + código 6 dígitos
├── Bloque 7: compatibilidad (+ contratos según Opción A/B)
├── Bloques 8–10: transversales sin cambio
├── Bloque 11: 809 con nota LN
└── Bloques 12–13: transversales sin cambio

OMITIR siempre:
├── buildBlock6PortabilitySpeech (proceso portabilidad + CAP)
└── PORTABILITY_DISCLAIMER en resumen
```

---

## 9. Estructura UI teleprompter LN (13 bloques)

| # | id | sectionLabel | Origen |
|---|-----|--------------|--------|
| 1 | `bloque-1` | Inicio | `buildBlock1SaludoSpeech` + nota raw `[1]` |
| 2 | `bloque-2` | Audio | `buildBlock2AudioSpeech` |
| 3 | `bloque-3` | Contratación | `contract-resumen` adaptado |
| 4 | `bloque-4` | Plan | `buildMultilineBenefitsSpeech` |
| 5 | `bloque-5` | Condiciones | `buildGeneralConditionsSpeech` |
| 6 | `bloque-6` | Entrega | Delivery LN adaptado |
| 7 | `bloque-7` | Compatibilidad | Export compatibilidad (+ contratos) |
| 8 | `bloque-8` | Regalo | `buildBlock7GiftSpeech` |
| 9 | `bloque-9` | Encuesta | `buildBlock8SurveySpeech` |
| 10 | `bloque-10` | Aceptación | `buildBlock9AcceptanceSpeech` |
| 11 | `bloque-11` | Prefijo 809 | `buildBlock10Prefijo809Speech` adaptado |
| 12 | `bloque-12` | Referido | `buildBlock11ReferralSpeech` |
| 13 | `bloque-13` | Cierre | `buildBlock12FarewellSpeech` |

**Meta bar sugerida:** `Cliente · Plan · Total · Línea Nueva`

**Convención IDs (verificado Fase 3):** Los `LineaNuevaSectionId` (`introduccion`, `audio`, …) son claves internas del builder LN. Portabilidad usa `bloque-1`…`bloque-12` en steps persistidos. LN no está integrado a UI/registry — **sin impacto runtime hoy**. En integración final, el renderer mapeará a `bloque-N`.

---

## 10. Brechas gestión vs SPEC

| Requisito | Estado | Acción post-aprobación |
|-----------|--------|------------------------|
| `saleType = new_line` | ⚠️ Types LN existen | Conectar eligibility + builder |
| `carrier_despacho` | ❌ Falta en gestión | Campo obligatorio para Bloque 6 |
| `numero_nuevo` / ZS | ⚠️ Context LN | Bloque 3 + nota 809 |
| `folio_mat` | ⚠️ Context LN | Nota asesora Bloque 11 |
| Composición contratos raw `[20]` | ⏳ Opción A/B | Decisión negocio |
| Tests regresión Portabilidad | ✅ Existen | Ejecutar tras exports en block5 |

---

## 11. Fases post-aprobación

| Fase | Entregable |
|------|------------|
| **2** | ✅ Este SPEC — pendiente firma negocio |
| **3** | Implementación bloque por bloque con tests vs raw |
| **4** | Refactors compartidos (exports block5, param contract-resumen, param 809) |
| **5** | Auditoría funcional W/O/M, ALAS/NOMAD, tienda, 1–4 líneas |
| **6** | `LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING = false` + congelar v1.0 |
| **7** | Registrar flujo + UI *(fase explícita posterior)* |

---

## 12. Criterios de aceptación — checklist negocio

- [x] Bloque 1: **REUTILIZAR** saludo transversal + nota asesora raw `[1]` — **CONGELADO v1.0**
- [x] Bloque 3: **ADAPTAR** `contract-resumen.ts` mode `new_line` — **CONGELADO v1.0**
- [x] Bloque 7: **REUTILIZAR** vía export `buildCompatibilidadEquiposSpeech()` — **CONGELADO v1.0**
- [x] Bloque 8: **REUTILIZAR** `buildBlock7GiftSpeech` — **AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- [x] Bloque 9: **REUTILIZAR** `buildBlock8SurveySpeech` — **AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- [x] Bloque 10: **REUTILIZAR** `buildBlock9AcceptanceSpeech` — **AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- [x] Bloque 11: **ADAPTAR** override `advisorNoteOnBlockStart` — **AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- [x] Bloque 12: **REUTILIZAR** `buildBlock11ReferralSpeech` — **AUDITORÍA DOCUMENTAL APROBADA — CONGELADO v1.0**
- [x] Bloque 13: **REUTILIZAR** `buildBlock12FarewellSpeech` — **CONGELADO v1.0**
- [ ] Composición contratos raw `[20]`: Opción A o B
- [ ] Tabla ADAPTAR §2 aprobada en detalle
- [ ] Tabla REUTILIZAR §3 aprobada — sin variantes LN en builders transversales
- [ ] Campo `carrier_despacho` aprobado para gestión
- [ ] Refactors no rompen Portabilidad v1.0 congelado

---

## 13. Referencias

| Documento | Propósito |
|-----------|-----------|
| `source/linea-nueva-sin-equipo.raw.txt` | Texto oficial |
| `SPEC-teleprompter-portabilidad-sin-equipo.md` | Metodología |
| `TELEPROMPTER_ENGINE.md` | Bloque 1 transversal documentado |
| `teleprompter/blocks.ts` | Orquestador Portabilidad (referencia) |
| `linea-nueva/CONGELAMIENTO-DEFINITIVO.md` | Estado módulo LN |

---

*Revisión final Fase 2 — Lista para aprobación negocio. Comentarios: _______________*
