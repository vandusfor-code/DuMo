# Especificación funcional — Teleprompter Script de Cierre
## Portabilidad sin Equipo (vigente)

**Estado:** Borrador para validación — **NO implementar código hasta aprobación.**  
**Fuentes únicas:**
- `SCRIPT CIERRE 31 JULIO Portabilidad sin Equipo dumo (1).docx` → `source/portabilidad-sin-equipo.raw.txt`
- Oferta Comercial Julio 2026 → catálogo `CommercialPlan` (Plan W, O, M + promociones)

---

## 1. Objetivo del módulo

El módulo **Script** es un **teleprompter profesional** para la asesora durante una llamada telefónica.

| Sí | No |
|----|-----|
| Texto listo para leer en voz alta | Formulario |
| Lógica automática invisible | Documento dividido en “pasos” conversables |
| Variables resueltas desde la venta | Instrucciones internas del Word |
| ~9 bloques de lectura continua | 16+ pantallas que rompen el flujo |

**El cliente nunca ve esta pantalla.**

---

## 2. Clasificación del documento oficial

Cada línea del script oficial pertenece a **exactamente una** categoría:

### A — Discurso (SÍ mostrar)
Texto que la asesora pronuncia tal cual (con variables resueltas).

### B — Lógica del sistema (NO mostrar, ejecutar en código)
- Condiciones: “Si prepago…”, “Si despacho domicilio…”, “Si multilínea…”
- Ramificaciones: “Cliente responde SÍ/NO”
- Reglas: boletas $0, upselling, CAP, prefijo 809

### C — Instrucción interna (NUNCA mostrar)
Ejemplos del documento que **jamás** aparecen en pantalla:

```
(Según la hora de Chile)
(Menciona el nombre del plan como aparece en sistemas)
(INFORMAR AL CLIENTE LA FECHA EXACTA…)
Dependiendo del plan que lleve:
Valida con el cliente…
Si el cliente presenta dudas resuélvelas…
SI: Continuar NO: Corregir
Recuerda que no puedes fomentar una nota…
Se debe tener el SÍ explícito del cliente
(Pedir nombre y teléfono de referido)
DESHABILITACIÓN PREFIJO 809: Recuerda que si la contratación…
```

---

## 3. Variables de entrada (desde la gestión)

### 3.1 Cliente y asesora
| Variable | Origen |
|----------|--------|
| `nombre_cliente` | Gestión → customerName |
| `cliente_primer_nombre` | Derivado del nombre |
| `rut` | Gestión |
| `telefono` | Línea / gestión (formato 569-XXXX-XXXX) |
| `correo` | Línea principal |
| `direccion_completa` | dirección + comuna + región |
| `nombre_ejecutivo` | Sesión asesora |
| `correo_ejecutivo` | Sesión asesora |
| `saludo` | Calculado: hora Chile → buenos días / tardes / noches |

### 3.2 Venta
| Variable | Origen |
|----------|--------|
| `numero_portar` | Teléfono línea principal |
| `operador_actual` | Catálogo operadores |
| `plan` / `plan_id` | Línea principal → catálogo |
| `valor_plan` | `CommercialPlan.womValue` |
| `fecha_contratacion` | Fecha actual DD/MM/AAAA |
| `fecha_entrega` | Calculadora fechas (+5 días hábiles) |
| `tipo_entrega` | home \| store |
| `nombre_sucursal`, `direccion_sucursal`, `horario_sucursal` | Config tienda (línea principal) |

### 3.3 Modalidad portabilidad
| Variable | Origen | Efecto |
|----------|--------|--------|
| `accountType` | **Modalidad línea actual:** Prepago \| Postpago | Prepago → incluye bloque CAP |

### 3.4 Multilínea
| Variable | Origen |
|----------|--------|
| `cantidad_lineas` | lines.length |
| `cantidad_adicionales` | lines.length - 1 |
| `valor_linea_adicional` | `CommercialPlan.additionalLineValue` (default $7.990) |
| `total_mensual` | Suma planes por línea |
| `lineas[]` | Por cada línea: teléfono, plan, valor, beneficios |

### 3.5 Oferta comercial (catálogo)
| Variable | Origen |
|----------|--------|
| `beneficios` | **`CommercialPlan.commercialText`** del plan vendido |
| `promociones` | **`CommercialPlan.promotions`** (ej. 3° y 6° boleta $0) |
| `specs.*` | GB, roaming, PedidosYa, cupón, etc. |

### 3.6 Upselling *(pendiente en gestión — ver §8)*
| Variable | Origen |
|----------|--------|
| `is_upselling` | Flag venta |
| `numero_upsell` | Línea afectada |
| `plan_anterior` | Plan previo del cliente |
| `plan_nuevo` | Plan contratado |

---

## 4. Motor de reglas — árbol de decisión

```
VENTA GUARDADA
├── tipo_venta = portabilidad
│   └── equipmentMode ≠ "with"  → FLUJO: Portabilidad sin equipo
│       ├── accountType = postpaid → Postpago → Postpago (sin CAP)
│       └── accountType = prepaid  → Prepago → Postpago (con CAP)
│
├── cantidad_lineas = 1     → resumen monolínea
├── cantidad_lineas = 2..4  → resumen multilínea (texto específico por cantidad)
├── is_upselling = true     → reemplaza bloque multilínea normal por texto upselling
│
├── deliveryType = home     → bloque despacho domicilio
├── deliveryType = store    → bloque retiro tienda (excluye domicilio)
│
└── plan_id                 → beneficios + precio del plan exacto (W/O/M/…)
```

### 4.1 Escenarios confirmados en documento oficial

| Escenario | % contenido compartido | Diferencia |
|-----------|------------------------|------------|
| Postpago → Postpago | ~95% | **Sin** bloque CAP (líneas 46-52 omitidas) |
| Prepago → Postpago | ~95% | **Con** bloque CAP + ramas CAP recibido/no recibido |
| 1 línea | Base | Resumen simple |
| 2-4 líneas | Base | Texto “PLANES MÁS” + valor adicional $7.990 c/u |
| Upselling / homologación | Base | Texto línea 14 (reemplaza resumen multilínea estándar) |
| Despacho domicilio | Base | Líneas 23-27 |
| Retiro tienda | Base | Líneas 29-32 |

### 4.2 Ramificaciones conversacionales (misma pantalla, botones Sí/No)

| Momento | Pregunta al cliente | Si SÍ | Si NO |
|---------|---------------------|-------|-------|
| Post-audio | ¿Dudas con el audio? | Mostrar discurso aclaración *(inline)* | Continuar |
| Resumen | ¿Datos correctos? | Continuar | Mostrar “¿Cuál dato corregir?” *(inline)* → revalidar |
| CAP (solo prepago) | ¿Recibiste el CAP? | Discurso “Ya completamos…” | Discurso “Vigencia 5 días…” |
| Post-portabilidad | ¿Dudas del proceso? | Discurso aclaración *(inline)* | Continuar |
| Aceptación | ¿Lo aceptas? | Continuar | Reconfirmación *(inline)* |
| Prefijo 809 | ¿Deshabilitar 809? | Discurso aceptación | Persuasión + segunda pregunta *(inline)* |

**Regla:** Las ramas **no crean pantallas nuevas**. Expande el bloque actual y luego habilita “Continuar”.

---

## 5. Estructura del teleprompter — 9 bloques

Los **títulos** son apoyo visual discreto (tipografía pequeña, no parte del discurso).  
**No mostrar:** “Paso 1 de 16”, “Resolver dudas”, etc.

```
┌─────────────────────────────────────────┐
│ PORTABILIDAD SIN EQUIPO · Postpago       │  ← meta discreta
│ Entrega                                  │  ← título pequeño (opcional)
│ ─────────────────────────────────────── │
│                                          │
│  Tu chip será despachado a…             │  ← DISCURSO GRANDE
│  …                                       │
│                                          │
│  [ ✔ Sí ]  [ ✖ No ]   ← solo si aplica  │
│  [ ← Anterior ]  [ Continuar → ]       │
└─────────────────────────────────────────┘
```

### Bloque 1 — Saludo
**Título UI:** *(ninguno o “Inicio”)*  
**Discurso generado:**
```
Hola, {saludo}.

Hablas con {nombre_ejecutivo} de WOM.

¿Tengo el gusto de hablar con {nombre_cliente}?

Perfecto {cliente_primer_nombre}.

Para dar continuidad a lo que anteriormente conversamos, te informaré las condiciones de tu contratación.
```
**Fuente doc:** línea 2 (sin instrucciones de hora).

---

### Bloque 2 — Introducción + Audio
**Título UI:** *(discreto: “Audio legal”)*  
**Discurso — parte A (intro):**
```
{nombre_cliente}, has tomado una gran decisión.

Como no contamos con letra chica, a continuación escucharás una grabación de 30 segundos con las condiciones de tu contratación.

Te pido escuchar atentamente y no cortar. Retomaré la llamada para resolver tus dudas y hacer un breve resumen.
```
**Acción asesora (no leer):** reproducir grabación.  
**Discurso — parte B (post-audio):**
```
¿Tienes alguna duda con el audio que escuchaste?
```
**Rama Sí:** `{nombre}, con gusto te aclaro. Cuéntame qué parte del audio necesitas que te explique.`  
**Fuente doc:** líneas 4-7.

---

### Bloque 3 — Resumen de contratación
**Título UI:** *(discreto: “Contratación”)*  
**Discurso — validación datos:**
```
Continuamos con un breve resumen de tu contratación.

Tu nombre completo es {nombre_cliente}, RUT {rut}, domiciliado en {direccion_completa}, correo electrónico {correo} y tu número de contacto es {telefono}.

¿Son correctos tus datos?
```
**Rama No:** `Entiendo {nombre}. ¿Cuál dato necesitas corregir?`

**Discurso — contratación (automático según venta):**
```
Según las condiciones acordadas, aceptas contratar hoy {fecha} la portabilidad de tu número {numero_portar}, proveniente de {operador_actual}, a WOM con el plan {plan} por un valor mensual transparente de {valor_plan}.
```
+ Si `promociones.length > 0`:
```
Además, cuentas con {promociones} en los meses correspondientes de tu facturación.
```
+ Siempre:
```
Si por algún motivo el número no se porta, los beneficios explicados quedarán sin efecto. Por eso es importante cumplir con las condiciones de portabilidad que te explicaré en breve.
```
+ **Multilínea** (reglas §6) o **Upselling** (reglas §7).

**Fuente doc:** líneas 8-14 (sin instrucciones “Menciona el plan…”).

---

### Bloque 4 — Beneficios del plan
**Título UI:** *(discreto: “Plan”)*  
**Discurso — SIEMPRE desde catálogo, nunca genérico:**

Formato obligatorio:
```
{nombre_cliente}, el {plan} que acabas de contratar tiene un valor mensual de {valor_plan} e incluye:

{commercialText del plan — bullets exactos del catálogo}
```

**Ejemplo Plan O:**
```
Dulabs, el Plan O que acabas de contratar tiene un valor mensual de $13.990 e incluye:

• 300 GB para navegar en red 5G.
• Minutos libres.
…
```

**Multilínea con planes distintos:** repetir bloque por cada plan diferente (doc línea 12: “señalar uno a uno los beneficios según corresponda”).

**Fuente doc:** líneas 15-20 → **reemplazadas por catálogo**, no texto fijo del Word.

---

### Bloque 5 — Condiciones generales + Entrega
**Título UI:** *(discreto: “Condiciones y entrega”)*  
**Discurso A — condiciones (todos los planes):**
Texto íntegro línea 22 del documento oficial.

**Discurso B — entrega (UNO de dos):**

| Condición | Contenido |
|-----------|-----------|
| `deliveryType = home` | Líneas 24-27 (fecha resuelta, sin “INFORMAR AL CLIENTE…”) |
| `deliveryType = store` | Líneas 30-32 (sucursal, horario, fecha resueltos) |

**Compatibilidad equipos + contratos** (líneas 34-36): incluir en este bloque como discurso continuo post-entrega.

---

### Bloque 6 — Proceso de portabilidad + CAP
**Título UI:** *(discreto: “Portabilidad”)*  

**Discurso — proceso (todos):** líneas 39-45 (operador resuelto, nombre cliente resuelto).

**Discurso — CAP (solo `accountType = prepaid`):** líneas 48-52.
- Pregunta CAP → botones Sí/No
- Sí → línea 50
- No → línea 52

**Post-proceso:**
```
{nombre}, ¿alguna duda con el proceso de portabilidad?
```
Rama Sí → aclaración inline.

**Fuente doc:** líneas 37-53.

---

### Bloque 7 — Chip regalo + Encuesta
**Título UI:** *(discreto: “Cierre comercial”)*  

**Chip regalo:** línea 54 (texto íntegro, nombre resuelto).

**Encuesta NPS:** línea 57 (sin “Recuerda que no puedes fomentar una nota…”).

---

### Bloque 8 — Aceptación + VDI + Prefijo 809
**Título UI:** *(discreto: “Aceptación”)*  

**Secuencia:**
1. `¿Te queda alguna duda con las condiciones entregadas?` (línea 60)
2. `Entiendes y, en conjunto con iniciar el proceso de Validación de Identidad, aceptas las condiciones de este contrato. ¿Lo aceptas?` (líneas 63-65)
3. Prefijo 809 — líneas 69-73 (sin instrucción línea 67-68, sin “derivar formulario” visible)

**Ramas 809:** Sí → línea 70 | No → línea 71 + segunda pregunta | No definitivo → línea 72.

---

### Bloque 9 — Referido + Despedida
**Título UI:** *(discreto: “Despedida”)*  

**Referido:** línea 76 (sin “Pedir nombre…”).

**Despedida:** líneas 78-81 (correo y nombre ejecutivo resueltos).

---

## 6. Reglas multilínea (construcción automática)

| Líneas | Texto a generar |
|--------|-----------------|
| 1 | `Contratarás el {plan} por un valor mensual de {valor_plan}.` |
| 2 | Principal {plan} {valor} + 1 adicional a {valor_adicional} + total {total} |
| 3 | Principal {valor} + 2 adicionales a {valor_adicional} c/u + total |
| 4 | Principal {plan} {valor} + 3 adicionales a {valor_adicional} c/u + total |

Si **planes diferentes por línea:** listar cada línea con su plan y valor.

**Fuente doc:** línea 13.

---

## 7. Reglas upselling

**Condición:** venta marcada como homologación/upselling (campo pendiente en gestión).

**Texto (sustituye resumen multilínea estándar):**
```
Aceptas modificar el plan actual para el número {numero} al nuevo plan {plan_nuevo} con un monto a pagar de {valor_plan}.

Recuerda que si tenías algún beneficio anterior quedará inválido, pero ganarás los beneficios obtenidos con este nuevo plan.
```
**Fuente doc:** línea 14.

---

## 8. Brechas detectadas — gestión actual vs spec

| Requisito | Estado actual | Acción post-validación |
|-----------|---------------|------------------------|
| Modalidad Prepago/Postpago | ✅ Campo `accountType` en formulario | — |
| CAP condicional | ✅ Implementado | Verificar textos = doc oficial |
| 9 bloques vs 16 pantallas | ❌ 17 pasos separados | Consolidar bloques |
| Títulos discretos | ❌ Títulos grandes + “Paso X de Y” | Rediseño UI teleprompter |
| Beneficios genéricos fallback | ❌ “Tu plan incluye todos los beneficios…” | Eliminar fallback; obligar catálogo |
| Formato beneficios con nombre+plan | ❌ Solo `commercialText` crudo | Plantilla § bloque 4 |
| Upselling | ❌ Sin campo en gestión | Agregar flag + plan anterior |
| Multilínea por plan distinto | ❌ Solo resumen agregado | Iterar por línea |
| Textos = doc oficial | ⚠️ Parcialmente reescritos | Auditar frase por frase vs raw.txt |
| Ultra Express / NOMAD 3h | ❌ No detectado en gestión | Evaluar si aplica campo entrega |

---

## 9. Especificación UI del teleprompter

### 9.1 Jerarquía visual
1. **Meta bar** (pequeña): Cliente · Plan · Total · Modalidad (Prepago/Postpago)
2. **Etiqueta de bloque** (11px, muted, MAYÚSCULAS): ej. `ENTREGA`
3. **Discurso** (15-16px, leading relaxed): texto completo a leer
4. **Controles:** Sí/No (si aplica) → Continuar / Anterior

### 9.2 Prohibido en UI
- “Paso 3 de 16”
- Instrucciones entre paréntesis
- Texto gris tipo “Reproduce la grabación…”
- Placeholders sin resolver (`XXXX`, `{{plan}}`)
- Bloques vacíos cuando una condición no aplica (CAP en postpago = omitir, no mostrar pantalla vacía)

### 9.3 Navegación
- **Anterior / Continuar** entre los 9 bloques
- **Sí / No** solo dentro del bloque activo; expande texto inline
- Progreso: barra simple (9 segmentos), sin numeración verbal

---

## 10. Fases de implementación (post-aprobación)

| Fase | Entregable |
|------|------------|
| **0** | ✅ Este documento validado por negocio |
| **1** | Motor de reglas + resolución de variables |
| **2** | Generadores de discurso por bloque (tests unitarios vs raw.txt) |
| **3** | UI teleprompter 9 bloques |
| **4** | Campo upselling + multilínea heterogénea |
| **5** | QA con llamadas reales Plan W/O/M, prepago/postpago, 1-4 líneas |

---

## 11. Criterios de aceptación

- [ ] Asesora puede leer bloque a bloque sin interpretar instrucciones
- [ ] Cero textos del tipo “Dependiendo del plan…”, “Menciona…”, “Valida…”
- [ ] Beneficios = exactamente `commercialText` del plan vendido
- [ ] CAP aparece solo en Prepago → Postpago
- [ ] Despacho domicilio XOR tienda
- [ ] Upselling usa texto línea 14, no resumen estándar
- [ ] Multilínea genera texto distinto para 1, 2, 3, 4 líneas
- [ ] Máximo 9 pantallas de lectura
- [ ] Títulos UI discretos, no pronunciados
- [ ] Todas las frases auditadas contra documento oficial

---

*Documento generado para validación. Comentarios: _______________*
