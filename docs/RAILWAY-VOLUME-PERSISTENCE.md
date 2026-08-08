# Railway — persistencia de disco (riesgo operacional)

**Última actualización:** 2026-08-08  
**Afecta:** bridge Baileys (`services/web-qr-bridge`). El CRM always-on (Fase 4) tiene requisitos distintos — ver sección abajo.

---

## Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿La pérdida de sesión QR (`persistedSessions: 0`) la causó Fase 1? | **No.** Fase 1 no modificó `services/web-qr-bridge/`. |
| ¿Causa raíz identificada? | Falta de volumen persistente en Railway (disco efímero del contenedor). |
| ¿Infra corregida? | **Sí (2026-08-08)** — volumen montado en `/data/sessions` en el servicio bridge. |
| ¿Riesgo cerrado al 100%? | **No aún** — falta verificación funcional del operador (ver abajo). |

---

## Estado del volumen (bridge)

| Item | Estado |
|------|--------|
| Volumen Railway en `/data/sessions` | ✅ Agregado (2026-08-08) |
| Env `SESSIONS_DIR=/data/sessions` | ✅ Configurado en bridge |
| QR escaneado + `persistedSessions ≥ 1` | ✅ **Verificado** (2026-08-08, channel `webqr-a9cf9c4c-…`) |
| Redeploy de prueba → sesión sobrevive | ✅ **Verificado** (redeploy vía push `6a9f1b6`; post-redeploy `persistedSessions: 1`, status `CONNECTED`) |
| Outbound QR probado end-to-end | ✅ Bridge `/send` 200 + tráfico real en Leads (`webqr:573181904896`) |

Hasta completar las filas pendientes, asumir que el volumen está montado pero **no verificado en producción real**.

**Actualización 2026-08-08:** verificación funcional completada — volumen OK, sesión sobrevive redeploy, QR E2E operativo.

---

## Cómo funciona

```
Escaneo QR → bridge guarda creds en SESSIONS_DIR/{channelId}/creds.json
Reinicio/redeploy → restorePersistedSessions() lee disco y reconecta sin QR
Sin volumen persistente → disco efímero → creds se pierden → hay que escanear de nuevo
```

**Variables clave (Railway bridge):**

| Variable | Valor |
|----------|--------|
| `SESSIONS_DIR` | `/data/sessions` |
| Volumen Railway | Montado en **exactamente** `/data/sessions` |

---

## Verificación pendiente (operador)

1. Escanear QR en `/admin/web-qr`
2. `GET https://dumo-production.up.railway.app/health` → `persistedSessions >= 1`
3. Redeploy manual del servicio bridge → confirmar que `persistedSessions` **no** vuelve a 0
4. Enviar mensaje outbound desde DuMo → cliente lo recibe

---

## Fase 4 — ¿El CRM en Railway también necesita volumen?

**Respuesta corta:** el bridge **sí** (credenciales Baileys en disco). El CRM always-on **no debería depender de disco local** para estado crítico.

| Componente | ¿Volumen persistente? | Dónde va el estado |
|------------|----------------------|-------------------|
| **Bridge Baileys** (actual) | **Sí, obligatorio** | `{SESSIONS_DIR}/{channelId}/` — creds Baileys |
| **CRM Next.js (Fase 4)** | **No** (ideal) | Postgres (`DATABASE_URL1`), Redis/BullMQ para colas, Supabase Storage para media |
| **BullMQ / workers (Fase 4)** | **No** — usar Redis | Jobs en Redis, no en filesystem |
| **Logs / tmp del CRM** | Efímero (OK) | Se pierden en redeploy — esperado |
| **Uploads temporales** | Evitar disco local | Supabase Storage (ya en uso para WABA) |

**Implicación para Fase 4:** montar volumen en el servicio **bridge** (o sidecar Baileys si se separa), **no** en el servicio CRM principal. Si algún worker necesita scratch space, usar `/tmp` efímero o storage externo — nunca credenciales ni jobs críticos en disco del contenedor.

**Checklist Fase 4 (cuando lleguemos):**
- [ ] Postgres: Railway Postgres o mantener Supabase (decisión de arquitectura)
- [ ] Redis: plugin Railway para BullMQ + cache
- [ ] Bridge QR: confirmar volumen `/data/sessions` sigue montado (o servicio dedicado)
- [ ] CRM: **sin** volumen para estado de app — todo en BD + Redis + Storage

---

## Relación con Fase 1 (mergeado 2026-08-08)

Fase 1 cambia migraciones DDL y diagnóstico DB en Vercel. **No toca** el bridge ni Railway. El tema de sesión QR era infra del bridge, independiente del merge.

---

## Historial

| Fecha | Evento |
|-------|--------|
| 2026-08-08 | Detectado `persistedSessions: 0` — causa probable: sin volumen |
| 2026-08-08 | Volumen agregado en Railway (`/data/sessions`) |
| 2026-08-08 | Redeploy prueba — `persistedSessions` sigue en 1, sesión CONNECTED |
| 2026-08-08 | QR E2E: inbound/outbound confirmado en producción |
