# TELEPROMPTER_ENGINE.md

Motor de teleprónter DuMo — arquitectura, convenciones y guía de extensión.

**Estado:** Portabilidad Sin Equipo **v1.0 estable** (aprobado funcionalmente).

**Fuentes oficiales del flujo congelado:**
- `src/data/scripts/source/portabilidad-sin-equipo.raw.txt`
- `src/data/scripts/SPEC-teleprompter-portabilidad-sin-equipo.md`
- Oferta Comercial → catálogo `CommercialPlan` (Plan W, O, M)

---

## 1. Principios del motor

| Principio | Descripción |
|-----------|-------------|
| **Teleprónter, no formulario** | Texto listo para leer en voz alta. El cliente no ve esta pantalla. |
| **Snapshot congelado** | El script se genera **una vez** al guardar la gestión y se persiste en JSON. La UI **no** lo regenera al abrir la pestaña Script. |
| **Lógica invisible** | Condiciones comerciales, multilínea, prepago/postpago y ramificaciones viven en código — nunca como instrucciones internas en pantalla. |
| **Catálogo único** | Formulario, builder y Oferta Comercial consumen el mismo `CommercialPlan` (mismos IDs). Sin mocks paralelos ni fallbacks silenciosos. |
| **Flujo registrable** | Cada tipo de venta aporta bloques; el pipeline `context → engine → persistencia → UI` es compartido. |

---

## 2. Arquitectura en capas

```
┌─────────────────────────────────────────────────────────────────┐
│  UI — SalesScriptTab (src/components/leads/sales-script-tab.tsx)│
│  Lee steps[] persistidos · ramas Sí/No · notas discretas        │
└───────────────────────────────┬─────────────────────────────────┘
                                │ GET /api/leads/script
┌───────────────────────────────▼─────────────────────────────────┐
│  Persistencia — lead_gestiones.sales_script (JSON)              │
│  PostgresLeadRepository.saveSalesScript / getLatestSalesScript  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ saveLeadWithScript
┌───────────────────────────────▼─────────────────────────────────┐
│  Servicio — sales-script.service.ts                             │
│  generateAndSave → buildSalesScript → saveSalesScript           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  Builder — src/lib/sales-script/builder.ts                      │
│  eligibility → buildScriptContext → assembleGeneratedScript     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   context.ts              engine.ts            commercial-plans-catalog.ts
   ScriptBuildContext      resolveScriptFlow    validateGestionCommercialPlans
        │                       │
        │               flows/registry.ts
        │               portabilidad-sin-equipo.flow.ts
        │                       │
        └───────────► teleprompter/blocks.ts + block*-*.ts
```

### Módulos clave

| Módulo | Ruta | Responsabilidad |
|--------|------|-----------------|
| Builder | `src/lib/sales-script/builder.ts` | Punto de entrada: `buildSalesScript()`, `getScriptBuildError()` |
| Contexto | `src/lib/sales-script/context.ts` | Construye `ScriptBuildContext` desde gestión + catálogo + entrega |
| Motor | `src/lib/sales-script/engine.ts` | Resuelve flujo, ensambla `GeneratedSalesScript` |
| Registro de flujos | `src/lib/sales-script/flows/registry.ts` | `SCRIPT_FLOW_REGISTRY`, `resolveScriptFlow()` |
| Bloques | `src/lib/sales-script/teleprompter/blocks.ts` | Orquesta los 12 bloques del flujo activo |
| Validación | `src/lib/sales-script/teleprompter/teleprompter-validation.ts` | Errores pre-build (planes, entrega, multilínea) |
| Catálogo | `src/lib/commercial-plans-catalog.ts` | Única fuente de verdad; validación estricta por línea |
| Elegibilidad | `src/lib/sales-script/eligibility.ts` | Qué gestiones pueden generar script automático |
| Tipos | `src/types/sales-script.ts` | `SalesScriptStep`, `SalesScriptBranch`, `GeneratedSalesScript` |
| UI | `src/components/leads/sales-script-tab.tsx` | Navegación por bloques + interacción de ramas |

---

## 3. Flujo de generación y lectura

### 3.1 Al guardar una gestión de venta

```
LeadFormPanel → POST /api/leads
  → saveLeadWithScript()
      1. getLeadRepository().saveLead(input)
      2. getScriptUnavailableReason(input)     ← eligibility.ts
      3. salesScriptService.generateAndSave()
           → getCommercialConfigurationRepository().getSnapshot()
           → getDeliveryConfigurationRepository().getConfig()
           → buildSalesScript()
                → buildScriptContext()        ← falla si validación no pasa
                → assembleGeneratedScript()
                     → resolveScriptFlow(ctx)
                     → flow.buildSteps(ctx)
      4. saveSalesScript(gestionId, script)    ← JSON en lead_gestiones
      5. SaveLeadResult { lead, script, scriptUnavailableReason }
```

**Regla:** si el catálogo comercial no carga o un plan no cumple validación, la gestión **se guarda** pero el script queda `null` con `scriptUnavailableReason` explícito. No hay fallback genérico.

### 3.2 Al abrir la pestaña Script

```
useSalesScript(conversationId)
  → GET /api/leads/script?conversationId=…
  → getLatestSalesScript()   ← última gestión de la conversación
  → SalesScriptTab renderiza script.steps[]
```

**Regla:** la UI lee el JSON persistido. No invoca el builder en tiempo real.

---

## 4b. Portabilidad con Equipo — progreso de bloques

**Flujo:** `portabilidad-con-equipo.flow.ts` → `blocks-con-equipo.ts`  
**Fuente oficial:** `src/data/scripts/source/portabilidad-con-equipo.raw.txt`

| # | id | sectionLabel | Estado | Archivos |
|---|-----|--------------|--------|----------|
| 1 | `bloque-1` | Inicio | Transversal (Sin Equipo v1.0) | `block1-saludo-speech.ts` |
| 2 | `bloque-2` | Audio | Transversal (Sin Equipo v1.0) | `block2-audio-speech.ts` |
| 3 | `bloque-3` | Contratación | **✅ v1.0 congelado** | `block3-contratacion-con-equipo-speech.ts`, `block3-contract-summary-con-equipo-speech.ts`, `block3-equipment-financing-speech.ts`, `block3-portability-disclaimer-con-equipo.ts` |
| 4 | `bloque-4` | Plan | **✅ v1.0 congelado** | `block4-plan-benefits-con-equipo-speech.ts` |
| 5 | `bloque-5` | Entrega | **✅ v1.0 congelado** | `block5-condiciones-entrega-con-equipo-speech.ts` |
| 6 | `bloque-6` | Portabilidad | **✅ Bloque transversal v1.0 (congelado)** | `block6-portability-speech.ts` |
| 7–12 | — | — | Pendiente | — |

### Bloque 3 congelado (v1.0)

- Fase A: reutiliza `buildContractDataValidationIntro()` (infra compartida, copy Sin Equipo).
- Fase B: builders propios Con Equipo (resumen, disclaimer `ofrecidos`, multilínea, upselling, párrafo equipo).
- Párrafo equipo: único builder `buildBlock3EquipmentFinancingSpeech(ctx.mainEquipment)` — datos exclusivamente de `brand`, `model`, `color`, `downPayment`, `installments`, `installmentValue`.
- Rama condicional: `downPayment > 0` → pago inicial + link 24 h; `downPayment === 0` → sin pago inicial, sin link.
- **No modificar copy** salvo cambio del script oficial o hallazgo de auditoría.

### Bloque 4 congelado (v1.0)

- Builder único: `buildBlock4PlanBenefitsConEquipoSpeech(ctx)` — discurso desde `CommercialPlan.offer` vía `ctx.lineDetails`.
- Campos de oferta: `teleprompterHeading`, `dataAllowanceSpeechLabel`, `freeAppNames`, `clubBenefits`, `clubWomListPartners`, `pedidosYaTeleprompterLabel`, `handsetCoupon`, `freeDeviceInstallments`, flags de roaming/minutos/SMS/apps.
- Sin nombre del cliente, sin valor mensual, sin instrucción *“Dependiendo del plan que lleve”*, sin cierre multilínea Sin Equipo.
- Multilínea: un párrafo por `planId` único; homogénea = un solo párrafo.
- Cupón y cuotas gratis: redacción afirmativa (*tu equipo financiado*), cantidad de cuotas desde `freeDeviceInstallments.installmentNumbers.length`.
- **No modificar copy** salvo cambio del script oficial, Oferta Comercial o hallazgo de auditoría.

### Bloque 5 congelado (v1.0)

- Builder único: `buildBlock5CondicionesEntregaConEquipoSpeech(ctx)`.
- Condiciones generales (l.23) + entrega domicilio (l.25–28) o tienda (l.31–33) + contratos (l.39).
- Garantía equipos (l.37): solo si `Number(ctx.mainEquipment.downPayment) > 0`; omitida en pie $0.
- Sin compatibilidad multibandas, sin Ultra Express (doc Con Equipo no los incluye).
- Normalización OTP: *código OTP*, *WhatsApp*; titular: *Si recibes el producto como titular…*
- **No modificar copy** salvo cambio del script oficial o hallazgo de auditoría.

### Bloque 6 — transversal v1.0 (congelado)

- Reutiliza `buildBlock6PortabilitySpeech()` — builder único compartido con Portabilidad Sin Equipo (congelado v1.0).
- **No modificar** el builder; cambios solo vía nueva versión aprobada en ambos flujos.
- Ramas: `cap` (prepago → postpago) + `portabilityProcess` (dudas).
- Mismo comportamiento UI que Portabilidad Sin Equipo.

---

## 4. Portabilidad Sin Equipo — 12 bloques (v1.0)

| # | id | sectionLabel | Archivo | Ramificación |
|---|-----|--------------|---------|--------------|
| 1 | `bloque-1` | Inicio | `teleprompter/blocks.ts` | — |
| 2 | `bloque-2` | Audio | `teleprompter/blocks.ts` | `externalAudio` |
| 3 | `bloque-3` | Contratación | `contract-resumen.ts` + `blocks.ts` | `dataValidation` |
| 4 | `bloque-4` | Plan | `speech-builders.ts` → `plan-benefits-speech.ts` | — (multilínea en discurso) |
| 5 | `bloque-5` | Entrega | `block5-delivery-speech.ts` | Variante domicilio/tienda en build |
| 6 | `bloque-6` | Portabilidad | `block6-portability-speech.ts` | `cap` + `portabilityProcess` |
| 7 | `bloque-7` | Regalo | `block7-gift-speech.ts` | — |
| 8 | `bloque-8` | Encuesta | `block8-survey-speech.ts` | `npsSurvey` (2 fases) |
| 9 | `bloque-9` | Aceptación | `block9-acceptance-speech.ts` | `condicionesDudas` + `acceptance` |
| 10 | `bloque-10` | Prefijo 809 | `block10-prefijo809-speech.ts` | `prefijo809` |
| 11 | `bloque-11` | Referido | `block11-referral-speech.ts` | `referral` (nota asesora) |
| 12 | `bloque-12` | Cierre | `block12-farewell-speech.ts` | — |

### Bloques congelados (v1.0)

Los bloques 1–6 llevan marca explícita en código. **No modificar copy** sin aprobación de Calidad/negocio.

Los bloques 7–12 fueron auditados y aprobados funcionalmente en v1.0. Cualquier cambio de texto oficial requiere nueva validación.

### Ramas e interacción UI

Cada clave de `SalesScriptBranch` (`src/types/sales-script.ts`) debe tener soporte en tres funciones de `sales-script-tab.tsx`:

1. `getInteractionMode()` — qué controles mostrar (Sí/No, Continuar, CAP, etc.)
2. `resolveContent()` — qué texto concatenar según estado de la rama
3. `canAdvanceBlock()` — cuándo habilitar Continuar / avanzar al siguiente bloque

| Modo UI | Bloques | Comportamiento |
|---------|---------|----------------|
| `navigate` | 1, 7, 12; fases intermedias de 2, 3, 8 | Solo Continuar / Anterior |
| `binary` | 2 (post-audio), 3 (validación datos) | Sí / No |
| `cap` | 6 (prepago→postpago) | CAP recibido Sí/No |
| `dudas` | 6 | ¿Alguna duda con el proceso de porta? |
| `condiciones-dudas` | 9 | ¿Te queda alguna duda con las condiciones? |
| `acceptance` | 9 | ¿Lo aceptas? (VDI) |
| `809` / `809-followup` | 10 | Prefijo 809 + segunda oportunidad |

**Notas para la asesora:** texto pequeño, gris claro, cursiva, debajo del discurso. Prefijo: *"Nota para la asesora:"*. Nunca compiten visualmente con el texto al cliente.

---

## 5. Reglas comerciales

### 5.1 Catálogo único

- **Fuente:** `CommercialConfigurationRepository` → `commercialPlansService`
- **Formulario:** `GET /api/leads/plans` → `commercialPlansToAdvisorOptions()`
- **Builder:** `commercialConfig.plans` al generar
- **Validación:** `validateGestionCommercialPlans()` en `commercial-plans-catalog.ts`

Si falla cualquiera de estas condiciones por línea, **la generación se detiene** con mensaje explícito:

- `planId` inexistente
- Plan deshabilitado (`status !== "active"`)
- Sin Oferta Comercial configurada
- Sin beneficios para el discurso (Bloque 4)
- Sin configuración básica (nombre / valor WOM)

### 5.2 Multilínea y pricing

Implementado en `teleprompter/contract-pricing.ts` y `contract-resumen.ts`:

| Regla | Comportamiento |
|-------|----------------|
| Plan W | Solo 1 línea — no admite adicionales |
| Plan O / M | Hasta `maxAdditionalLines`; adicional a `additionalLinePrice` |
| Mismo plan en todas las líneas | Bloque 4 homogéneo + cierre multilínea |
| Planes distintos | Bloque 4 heterogéneo; máx. 2 planes distintos en portabilidad |
| Total mensual | Calculado desde `CommercialPlan`, coherente en Bloque 3 |

### 5.3 Condiciones de elegibilidad (v1.0)

`eligibility.ts` — script automático solo si:

- `gestion.type === "venta"`
- Al menos una línea
- Línea principal: `saleType === "portability"`
- Línea principal: `equipmentMode !== "with"` (sin equipo)

Otros tipos de venta devuelven `scriptUnavailableReason` legible; la gestión se guarda igual.

### 5.4 CAP (prepago → postpago)

`requiresCapCode` en contexto cuando:

```typescript
saleType === "portability" && accountType === "prepaid" && currentOperator !== "wom"
```

Activa rama `cap` en Bloque 6 antes de la pregunta de dudas de portabilidad.

---

## 6. ScriptBuildContext

Objeto central que alimenta todos los bloques (`src/lib/sales-script/context.ts`):

| Campo | Uso |
|-------|-----|
| `vars` | Mapa de placeholders resueltos (`nombre_cliente`, `operador_actual`, `total_mensual`, `fecha_entrega`, `correo_ejecutivo`, …) |
| `mainLine` / `lines` | Líneas raw de la gestión |
| `lineDetails` | `LineSpeechDetail[]` — plan, beneficios y pricing por línea |
| `planDetail` | `CommercialPlan` de la línea principal |
| `saleType` | Tipo de venta de la línea principal |
| `hasEquipment` | Alguna línea con `equipmentMode === "with"` |
| `requiresCapCode` | Rama CAP en Bloque 6 |
| `deliveryIsHome` / `deliveryIsStore` | Variante Bloque 5 |
| `contactPhones` | Teléfonos de contacto para entrega |
| `isUltraExpressDelivery` | Addendum OTP Ultra Express (extensible) |
| `totalMonthly` | Total mensual coherente con catálogo |
| `accountType` | `prepaid` \| `postpaid` → meta + CAP |

**Convención:** agregar variables nuevas en `vars` desde el contexto; los bloques las consumen vía `v(ctx, "clave")`. No hardcodear datos de gestión dentro de archivos de speech.

---

## 7. Modelo de datos persistido

```typescript
GeneratedSalesScript {
  id, gestionId, conversationId,
  flowKey: "PORTABILIDAD_SIN_EQUIPO",
  flowTitle: "Portabilidad sin equipo",
  meta: { clientName, planName, totalMonthlyLabel, accountModalityLabel, advisorSummary },
  steps: SalesScriptStep[],      // ← teleprónter (con branch opcional)
  structured: StructuredScriptPayload,  // compatibilidad / export
  createdAt
}
```

Cada `SalesScriptStep`:

```typescript
{
  id: "bloque-N",
  sectionLabel: "…",   // orientación interna — NO se lee al cliente
  content: "…",        // discurso fase inicial del bloque
  branch?: SalesScriptBranch  // ramas y discursos adicionales
}
```

---

## 8. Verificación

Antes de cualquier release de flujo:

```bash
npx tsx scripts/verify-teleprompter.ts
```

Escenarios cubiertos: Plan W/O/M, multilínea homogénea/heterogénea, prepago CAP, retiro tienda, upselling, planId inválido (debe rechazar), frases oficiales por bloque, presencia de 12 bloques.

---

## 9. Cómo extender a nuevos flujos

Patrón obligatorio para **Portabilidad con Equipo**, **Línea Nueva** y **Renovación**:

### Paso 1 — Registrar el flujo

```typescript
// src/lib/sales-script/flows/portabilidad-con-equipo.flow.ts
export const SCRIPT_TIPO = "PORTABILIDAD_CON_EQUIPO" as const;
export function buildPortabilidadConEquipoFlow(ctx: ScriptBuildContext): SalesScriptStep[] {
  return buildTeleprompterBlocksConEquipo(ctx); // orquestador propio
}

// src/lib/sales-script/flows/registry.ts
SCRIPT_FLOW_REGISTRY[PORTABILIDAD_CON_EQUIPO_KEY] = {
  key: PORTABILIDAD_CON_EQUIPO_KEY,
  title: "Portabilidad con equipo",
  buildSteps: buildPortabilidadConEquipoFlow,
};
```

### Paso 2 — Enrutar en resolveScriptFlow()

```typescript
if (ctx.saleType === "portability" && ctx.hasEquipment) {
  return SCRIPT_FLOW_REGISTRY[PORTABILIDAD_CON_EQUIPO_KEY];
}
if (ctx.saleType === "new_line") {
  return SCRIPT_FLOW_REGISTRY[LINEA_NUEVA_KEY];
}
// …
```

### Paso 3 — Actualizar eligibility.ts

Ampliar `getScriptUnavailableReason()` con las condiciones del nuevo flujo.

### Paso 4 — Bloques

- **Reutilizar** bloques transversales sin cambio de copy: Encuesta (8), Prefijo 809 (10), Referido (11), Cierre (12), Audio (2) — si el script oficial lo permite.
- **Fork** bloques específicos: crear `block*-*.ts` nuevos o variantes por flujo; no mezclar copy de distintos flujos en el mismo archivo congelado.
- **Orquestar** en un `blocks-con-equipo.ts` (o similar) separado de `blocks.ts` v1.0.

### Paso 5 — Validación comercial

- Mantener `validateGestionCommercialPlans()` para todos los flujos.
- Agregar reglas específicas junto a `validateTeleprompterLineRules()` si el flujo lo requiere (p. ej. financiamiento de equipo).

### Paso 6 — UI

Si el nuevo flujo introduce ramas no existentes en `SalesScriptBranch`:
1. Extender el tipo en `sales-script.ts`
2. Implementar en `getInteractionMode`, `resolveContent`, `canAdvanceBlock`
3. Agregar escenarios en `verify-teleprompter.ts`

### Paso 7 — Documentación y congelación

- Nueva sección en SPEC oficial + `raw.txt`
- Auditoría funcional completa antes de marcar v1.0 del flujo
- No reutilizar el congelado de Portabilidad Sin Equipo como plantilla de copy — solo como plantilla de **arquitectura**

---

## 10. Qué NO hacer

| Anti-patrón | Motivo |
|-------------|--------|
| Regenerar script al abrir la pestaña | Rompe el snapshot auditado |
| `PLANS_MOCK` o catálogos paralelos | IDs inconsistentes entre formulario y Bloque 4 |
| Fallback genérico en Bloque 4 | Oculta errores de configuración comercial |
| Instrucciones internas del Word en `content` | El teleprónter es solo discurso al cliente |
| Modificar bloques congelados sin aprobación | v1.0 queda invalidado |
| Parches de índice en UI para “saltar” bloques | Corregir `canAdvanceBlock` / ramas en su origen |

---

## 11. Referencia rápida de archivos

```
src/lib/sales-script/
├── builder.ts
├── context.ts
├── engine.ts
├── eligibility.ts
├── contract-resumen.ts
├── flows/
│   ├── registry.ts
│   └── portabilidad-sin-equipo.flow.ts
└── teleprompter/
    ├── blocks.ts
    ├── teleprompter-validation.ts
    ├── speech-builders.ts
    ├── plan-benefits-speech.ts
    ├── contract-pricing.ts
    ├── block5-delivery-speech.ts … block12-farewell-speech.ts

src/lib/commercial-plans-catalog.ts
src/services/sales-script.service.ts
src/services/save-lead-with-script.ts
src/components/leads/sales-script-tab.tsx
src/types/sales-script.ts
scripts/verify-teleprompter.ts
```

---

*Documento generado al cierre de Portabilidad Sin Equipo v1.0 estable. Base para Portabilidad con Equipo, Línea Nueva y Renovación.*
