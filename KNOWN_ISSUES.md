# Incidencias conocidas — Módulo Chat (texto + imágenes)

**Alcance congelado:** DuMo solo maneja **mensajes de texto** e **imágenes**.  
Fuera de alcance: PDF, video, audio, documentos, stickers, GIF, HEIC, compresión automática, OCR, IA y nuevos tipos de mensaje.

**Última actualización:** 2026-08-06  
**Estado de validación funcional:** ⏸ **BLOQUEADA** — el checklist obligatorio no puede completarse hasta desplegar el módulo y ejecutar pruebas con WhatsApp real.

**Producción:** `https://du-mo.vercel.app`  
**Commit desplegado (activo):** `0699052` — *Portabilidad con Equipo v1.0* (sin módulo de imágenes)  
**Último deploy a producción:** `du-77se7gt41` — **Error** (hace ~3 h)  
**Deploy activo anterior:** `du-p5oiqchzt` — Ready (hace ~6 h)

---

## Checklist obligatorio — estado actual

Leyenda: ✅ Pasó · ❌ Falló · ⏸ Bloqueado (no ejecutado) · ⏳ Pendiente de prueba real

### Producción (pre-requisito)

| # | Prueba | Estado | Notas |
|---|--------|--------|-------|
| P1 | Módulo de imágenes desplegado | ❌ | Código local sin commit; producción en commit anterior |
| P2 | Deploy exitoso | ❌ | Último deploy en Error; activo es deploy anterior |
| P3 | Credenciales funcionan (DB, Supabase, WhatsApp) | ⏸ | No verificable sin deploy del módulo + prueba E2E |
| P4 | WhatsApp recibe y envía imágenes | ⏸ | Requiere módulo desplegado + teléfono de prueba |

### Recepción (cliente → DuMo)

| # | Prueba | Estado | Notas |
|---|--------|--------|-------|
| R1 | Imagen JPG | ⏸ | |
| R2 | Imagen PNG | ⏸ | |
| R3 | Captura de pantalla | ⏸ | |
| R4 | Imagen con caption | ⏸ | |
| R5 | Varias imágenes consecutivas | ⏸ | |
| R6 | Aparece inmediatamente | ⏸ | |
| R7 | Nunca aparece `[image]` | ⏸ | |
| R8 | Se guarda correctamente | ⏸ | |
| R9 | Se visualiza correctamente | ⏸ | |

### Envío (asesor → WhatsApp)

| # | Prueba | Estado | Notas |
|---|--------|--------|-------|
| E1 | Seleccionar imagen (clip) | ⏸ | UI no desplegada en producción |
| E2 | Arrastrar imagen | ⏸ | |
| E3 | Pegar imagen (Ctrl+V) | ⏸ | |
| E4 | Enviar con caption | ⏸ | |
| E5 | Enviar sin caption | ⏸ | |
| E6 | Llega correctamente a WhatsApp | ⏸ | |

### Plantillas

| # | Prueba | Estado | Notas |
|---|--------|--------|-------|
| T1 | Crear plantilla: texto + 3 imágenes | ⏸ | `/admin/plantillas` no existe en producción |
| T2 | Orden correcto al enviar | ⏸ | |
| T3 | Tiempos correctos (~350 ms entre mensajes) | ⏸ | |
| T4 | Persistencia | ⏸ | |
| T5 | Actualización inmediata del chat | ⏸ | |

### Visor

| # | Prueba | Estado | Notas |
|---|--------|--------|-------|
| V1 | Zoom | ⏸ | Sin imágenes en historial de producción |
| V2 | Pantalla completa | ⏸ | |
| V3 | Escape | ⏸ | |
| V4 | Cerrar con clic fuera | ⏸ | |
| V5 | Descarga | ⏸ | |

### Storage

| # | Prueba | Estado | Notas |
|---|--------|--------|-------|
| S1 | Imágenes existen en Supabase Storage | ⏸ | |
| S2 | Registro en `media_assets` | ⏸ | |
| S3 | Sin URLs temporales de Meta en historial | ⏸ | |

---

## Inventario de incidencias

> **Regla:** no corregir hasta completar el checklist. Solo documentar.  
> Al resolver una incidencia, cambiar `Estado` a **Resuelto** y anotar fecha.

---

### ISSUE-001

**Descripción:** El módulo de chat multimedia (imágenes) **no está desplegado en producción**. Todo el código vive en cambios locales sin commit (~40 archivos nuevos/modificados). Producción ejecuta commit `0699052`, anterior al módulo.

**Cómo reproducirlo:**
1. Abrir `https://du-mo.vercel.app/admin/leads`.
2. Comparar con código local: no existe `/api/whatsapp/send-media`, webhook sin procesamiento de imágenes, nav sin “Plantillas”.

**Impacto:** Ninguna prueba funcional del checklist puede ejecutarse en producción. Validar hoy probaría el chat **sin soporte de imágenes**.

**Prioridad:** Alta

**Estado:** Pendiente

---

### ISSUE-002

**Descripción:** El último deploy a producción (`du-77se7gt41`, 2026-08-06 ~16:41 COT) terminó en **Error**. Vercel no expone logs porque el build nunca llegó a READY.

**Cómo reproducirlo:**
```bash
npx vercel ls
# Ver deploy con status ● Error
npx vercel inspect du-77se7gt41-vandusfor-4970s-projects.vercel.app
```

**Impacto:** Cualquier intento reciente de publicar cambios falló; producción sigue en un deploy anterior sin el módulo.

**Prioridad:** Alta

**Estado:** Pendiente

---

### ISSUE-003

**Descripción:** La bandeja de conversaciones en producción está **vacía** (0 conversaciones en `/admin/leads` al 2026-08-06).

**Cómo reproducirlo:**
1. Iniciar sesión en `https://du-mo.vercel.app/admin/leads`.
2. Observar filtros “Todas 0”, “Nuevo 0”, etc.

**Impacto:** Aunque el módulo estuviera desplegado, no hay historial para probar visor, render ni storage sin generar tráfico WhatsApp primero.

**Prioridad:** Media

**Estado:** Pendiente

---

### ISSUE-004

**Descripción:** La ruta `/admin/plantillas` y el ítem “Plantillas” en navegación **no existen en producción** (sí en código local).

**Cómo reproducirlo:**
1. Navegar a `https://du-mo.vercel.app/admin/plantillas` → redirige o 404.
2. Revisar nav admin en producción: no aparece “Plantillas”.

**Impacto:** Imposible ejecutar pruebas T1–T5 del checklist hasta desplegar.

**Prioridad:** Alta

**Estado:** Pendiente

---

### ISSUE-005

**Descripción:** Entorno local de desarrollo **sin credenciales** de Postgres, Supabase ni WhatsApp (`.env.local` solo contiene Google Sheets).

**Cómo reproducirlo:**
1. Revisar `.env.local` — faltan `DATABASE_URL1`, `SUPABASE_*`, `WHATSAPP_*`.
2. Ejecutar dev local: el chat opera en modo mock sin persistencia ni WhatsApp real.

**Impacto:** No se puede ejecutar el checklist E2E en local sin configurar variables o usar credenciales de Vercel.

**Prioridad:** Alta

**Estado:** Pendiente

---

### ISSUE-006

**Descripción:** Imágenes **mayores a 5 MB** son rechazadas en envío manual (`POST /api/whatsapp/send-media` devuelve 422). WhatsApp Cloud API limita imágenes por enlace a 5 MB.

**Cómo reproducirlo:**
1. (Tras deploy) Adjuntar imagen > 5 MB en el composer.
2. Intentar enviar → mensaje: *"La imagen supera 5 MB (límite de WhatsApp)…"*.

**Impacto:** Asesores con fotos de cámara alta resolución no podrán enviar sin comprimir manualmente. **No se implementará compresión hasta confirmar que esto ocurre en pruebas reales.**

**Prioridad:** Media *(confirmar en prueba real)*

**Estado:** Pendiente

---

### ISSUE-007

**Descripción:** Compatibilidad **HEIC** con navegadores no verificada en prueba real. Si Meta entrega `image/heic` y se almacena tal cual, Chrome/Firefox podrían no renderizar la miniatura.

**Cómo reproducirlo:**
1. (Tras deploy) Enviar foto desde iPhone al número WhatsApp de DuMo.
2. Abrir chat en DuMo (Chrome) → verificar si la miniatura se ve.

**Impacto:** Posible imagen rota en UI para fotos iPhone. **Fuera de alcance hasta confirmar en prueba real.**

**Prioridad:** Media *(confirmar en prueba real)*

**Estado:** Pendiente

---

### ISSUE-008

**Descripción:** El endpoint `POST /api/whatsapp/send` (texto) **no exige autenticación**, a diferencia de `POST /api/whatsapp/send-media` que sí usa `getTenantScope()`.

**Cómo reproducirlo:**
1. (Tras deploy) Enviar POST anónimo a `/api/whatsapp/send` con `conversationId`, `to`, `text`.
2. Si responde 200, cualquier actor con la URL podría enviar mensajes.

**Impacto:** Riesgo de seguridad en producción si el endpoint es accesible públicamente.

**Prioridad:** Alta *(verificar en staging/producción)*

**Estado:** Pendiente

---

### ISSUE-009

**Descripción:** Si el envío a WhatsApp **falla después** de subir la imagen a Supabase, el archivo puede quedar **huérfano** en storage (sin mensaje asociado en `lead_messages`).

**Cómo reproducirlo:**
1. (Tras deploy) Simular token Meta inválido o URL pública inaccesible para Meta.
2. Enviar imagen desde composer → revisar bucket Supabase vs `lead_messages`.

**Impacto:** Consumo de almacenamiento sin valor; no afecta UX directa del asesor.

**Prioridad:** Baja

**Estado:** Pendiente

---

### ISSUE-010

**Descripción:** Arrastrar un archivo **no imagen** (PDF, etc.) al composer se **ignora silenciosamente** — sin mensaje al asesor.

**Cómo reproducirlo:**
1. (Tras deploy) Arrastrar un PDF sobre el área del composer.
2. No ocurre nada visible.

**Impacto:** Confusión menor; alineado con alcance solo-imágenes. Mejora UX opcional post-validación.

**Prioridad:** Baja

**Estado:** Pendiente

---

## Próximos pasos (sin desarrollo)

1. **Commit + deploy** del módulo de imágenes a Vercel (resolver ISSUE-001 y ISSUE-002).
2. **Ejecutar checklist** completo con teléfono WhatsApp de prueba.
3. **Registrar aquí** cada fallo nuevo con ID incremental (`ISSUE-011`, …).
4. **Revisar juntos** el inventario y decidir qué corregir (solo problemas confirmados en prueba real).

---

## Plantilla para nuevas incidencias

```markdown
### ISSUE-XXX

**Descripción:**

**Cómo reproducirlo:**

**Impacto:**

**Prioridad:** Alta / Media / Baja

**Estado:** Pendiente / En progreso / Resuelto
```
