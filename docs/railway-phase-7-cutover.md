# Fase 7 — Corte final a Railway (producción)

**Estado:** ✅ **Corte declarado exitoso** — 2026-08-09T02:40:45Z (8 ago 2026, 9:40 PM UTC-5)

**Contexto validado en staging (Fases 4–6):**
- CRM Railway: `https://dumo-crm-production.up.railway.app`
- Bridge QR: `https://dumo-production.up.railway.app` (volumen `/data/sessions`)
- Postgres + Redis en proyecto Railway `ample-adventure`
- Producción actual usuarios: `https://du-mo.vercel.app` → Supabase (`DATABASE_URL1` en Vercel, **sin tocar** hasta el corte)
- QR inbound hoy: bridge → `DUMO_WEBHOOK_URL` = Vercel webhook

---

## 1. Backup fresco el día del corte

### Scripts listos (repo `feat/railway-phase-3`)

| Script | Cuándo usarlo | Requiere |
|--------|---------------|----------|
| **`scripts/backup-db-supabase.mjs`** | **Recomendado** — exporta Supabase prod vía REST (no necesitas `DATABASE_URL1` local) | `.env.vercel.production` con `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| `scripts/backup-db-node.mjs` | Alternativa si tienes URI Postgres directa | `DATABASE_URL1` en env |
| `scripts/backup-db.mjs` | Alternativa con `pg_dump` instalado | `DATABASE_URL1` + `pg_dump` en PATH |

**No usar** `backups/dumo-backup-2026-08-08.json` para el corte — solo sirvió para staging (Fase 3).

### Comando exacto (PowerShell, día del corte)

Desde la raíz del repo, **minutos antes** del import:

```powershell
cd C:\Users\HP\Documents\dumo

# Opción A — recomendada (Supabase REST)
node --env-file=.env.vercel.production scripts/backup-db-supabase.mjs `
  --output backups/dumo-backup-CORTE-$(Get-Date -Format yyyy-MM-dd).json

# Opción B — si tienes DATABASE_URL1 de prod en .env.production.local
node --env-file=.env.production.local scripts/backup-db-node.mjs `
  --output backups/dumo-backup-CORTE-$(Get-Date -Format yyyy-MM-dd).json
```

Anota la ruta del archivo generado (ej. `backups/dumo-backup-CORTE-2026-08-15.json`) y el conteo total que imprime el script. **Guarda una copia fuera del repo** (Drive/USB) además del archivo local.

### Import + verify al Postgres Railway

Necesitas `.env.railway.postgres.local` (o equivalente prod) con `RAILWAY_TEST_DATABASE_URL` apuntando al **TCP proxy externo** del Postgres Railway (mismo que Fase 3):

```powershell
# 1) Import fresco (--fresh reemplaza datos)
node --env-file=.env.railway.postgres.local scripts/railway-postgres-import.mjs `
  --file backups/dumo-backup-CORTE-YYYY-MM-DD.json --fresh

# 2) Verify — hoy el script compara vs backup hardcodeado 2026-08-08;
#    para Fase 7, comparar conteos manualmente o actualizar backupPath en el script.
#    Mínimo aceptable el día del corte:
curl.exe -s https://dumo-crm-production.up.railway.app/api/system/db
# → conversations/messages >= conteos del backup fresco
```

**Tablas críticas a comparar:** `lead_conversations`, `lead_messages`, `users`, `lead_gestiones`, `crm_clients`.

---

## 2. Plan de rollback — pasos exactos y tiempos

**Premisa:** durante staging **no** cambiaste `DATABASE_URL1` en Vercel. Supabase sigue siendo la BD “buena” de prod hasta que cortes el webhook. Eso hace el rollback **rápido** si actúas antes de que pase mucho tráfico nuevo solo en Railway.

### Escenario A — Fallo **antes** de cambiar `DUMO_WEBHOOK_URL` (solo import/verify falló)

| Paso | Acción | Tiempo |
|------|--------|--------|
| 1 | No tocar DNS ni bridge | — |
| 2 | Re-importar backup si hace falta, o abortar corte | 5–15 min |
| **Total** | | **~5–15 min** |

**Sin pérdida de datos** — producción sigue 100% en Vercel + Supabase.

---

### Escenario B — Fallo **después** de cambiar webhook, **antes** de DNS

Síntoma: mensajes QR nuevos van a Railway Postgres; usuarios en `du-mo.vercel.app` no los ven.

| # | Acción | Comando / dónde | Tiempo |
|---|--------|-----------------|--------|
| 1 | Revertir webhook bridge → Vercel | Railway → servicio **DuMo** (bridge) → Variables: `DUMO_WEBHOOK_URL=https://du-mo.vercel.app/api/web-qr/webhook` → redeploy | **2–4 min** |
| 2 | Verificar webhook | `node scripts/verify-web-qr-cutover.mjs https://du-mo.vercel.app` | 1 min |
| 3 | Mensaje QR real de prueba → debe aparecer en Vercel Leads | manual | 2 min |
| **Total** | | | **~5–10 min** |

**Pérdida de datos:** mensajes QR recibidos **solo en Railway** entre el cambio de webhook y el rollback **no** estarán en Supabase/Vercel. Anota hora del cambio de webhook para evaluar cuántos hilos re-sync manualmente si hace falta.

---

### Escenario C — Fallo **después** de cortar DNS a Railway

| # | Acción | Comando / dónde | Tiempo |
|---|--------|-----------------|--------|
| 1 | DNS: volver `du-mo.vercel.app` a Vercel | Según registrador/Vercel Domains — CNAME/A record como antes del corte | **5–60 min** (TTL DNS; si TTL=300s ≈ 5 min) |
| 2 | Webhook bridge → Vercel (igual Escenario B paso 1) | Railway DuMo service | **2–4 min** |
| 3 | **No** hace falta tocar `DATABASE_URL1` en Vercel si nunca lo cambiaste | — | 0 |
| 4 | Smoke Vercel | `node scripts/verify-web-qr-cutover.mjs` | 1 min |
| 5 | Login + bandeja en `https://du-mo.vercel.app` | manual | 3 min |
| **Total práctico** | | | **~15–25 min** (con TTL bajo) hasta **~1 h** (TTL alto) |

**Pérdida de datos:** todo tráfico (UI + QR inbound) procesado en Railway desde el corte DNS hasta el rollback **no** estará en Supabase. Ventana típica a minimizar: **< 30 min** de observación post-corte antes de declarar éxito o rollback.

**Vercel CRM:** sigue desplegado; no borrar el proyecto Vercel hasta **≥ 7 días** de estabilidad en Railway.

---

### ⚠️ Post-corte (2026-08-08) — rollback ya no es “sin pérdida”

**Estado:** corte ejecutado. Tráfico de usuarios pasa por proxy Vercel → Railway CRM; BD activa = **Railway Postgres**. Supabase queda congelado como respaldo (~142 conv / ~787 msgs al momento del diff).

| Ventana | Rollback “gratis” | Qué implica revertir |
|---------|-------------------|----------------------|
| **Antes** de cambiar webhook (Escenario A) | ✅ Sí | Prod 100% Vercel + Supabase; cero datos nuevos solo en Railway |
| **Entre** webhook y DNS/proxy (Escenario B) | ⚠️ Parcial | Pierdes msgs QR solo en Railway en esa ventana |
| **Después** del corte + proxy activo (ahora) | ❌ No | Revertir proxy + webhook devuelve UI a Supabase **antiguo**; **pierdes todo** lo escrito en Railway desde el corte (conversaciones/mensajes nuevos, cola procesada, etc.) |

**Implicación práctica:** la red de seguridad Vercel (7 días) sigue siendo válida para **restaurar el stack anterior**, pero **no** para recuperar datos nuevos de Railway automáticamente. Un rollback post-corte requiere export selectivo desde Railway → Supabase (como hicimos al revés con los 20 msgs split-brain) o aceptar pérdida de la ventana Railway.

**Proxy `beforeFiles` y rollback:** quitar rewrites en `next.config.ts` + redeploy Vercel → Vercel vuelve a servir Next.js propio con `DATABASE_URL1` → Supabase (sin cambios en env Vercel). También revertir `DUMO_WEBHOOK_URL` del bridge. Tiempo ~15–25 min (Escenario C). WebSocket vuelve a polling 45s en Vercel serverless.

---

## 3. Ventana paralela (24–48 h) vs. corte directo — tu caso concreto

### Lo que ya tienes validado (no genérico)

| Área | Evidencia staging |
|------|-------------------|
| Login / sesiones | Mismo `AUTH_SECRET` |
| Leads / permisos | Admin vs asesora, auto-assign |
| QR outbound | CRM → bridge `/send` |
| QR inbound | Webhook simulado + cola BullMQ |
| WABA | Solo lectura historial (~57 conv) |
| WebSocket | Multi-sesión + re-emit post-assign (manual OK) |
| Cola | Ráfaga 8 msgs, 0 pérdidas, ~300 ms ACK |

### Opción 1 — Corte directo (una ventana, ~45–90 min)

**Secuencia:** backup fresco → import Railway → verify conteos → cambiar `DUMO_WEBHOOK_URL` → smoke Railway URL → cortar DNS → smoke `du-mo.vercel.app` (ahora Railway) → observar 30–60 min.

| Pros | Contras |
|------|---------|
| **Sin split-brain** — usuarios y webhooks siempre en el mismo stack | Una sola ventana de riesgo concentrada |
| Rollback Escenario B/C **probado en docs**, 15–25 min con TTL bajo | Mensajes entre webhook switch y rollback se pierden en Supabase |
| Alineado con lo ya probado en staging (misma arquitectura) | Requiere disciplina: no mezclar pasos fuera de orden |
| Vercel + Supabase quedan como red de seguridad **sin reconfigurar** | |

**Recomendado para ti** dado el nivel de pruebas ya hecho — con ventana en horario bajo tráfico (noche/fin de semana Colombia).

---

### Opción 2 — “Paralelo” 24–48 h

**Importante:** no existe dual-webhook en el código. “Paralelo” real solo puede ser:

| Variante | Qué implica | ¿Viable? |
|----------|-------------|----------|
| **2a. Staging URL para el equipo** | Ya lo hiciste (Fases 4–6). Usuarios reales siguen en Vercel. | ✅ Hecho |
| **2b. Webhook a Railway 48 h, DNS en Vercel** | Clientes en `du-mo.vercel.app` **no ven** mensajes QR nuevos; solo quien use URL Railway | ❌ Split-brain — **no** para prod |
| **2c. DNS a Railway 48 h, webhook ya en Railway** | Usuarios en Railway; Vercel idle como rollback | ≈ Corte directo + 48 h observación antes de apagar Vercel |
| **2d. Subdominio** (ej. `app.du-mo.com` → Railway, `du-mo.vercel.app` → Vercel) | Dos URLs distintas; confusión de usuarios; dos BDs si no sincronizas | ⚠️ Solo piloto interno |

| Pros (2c — la única paralela sensata post-corte) | Contras |
|--------------------------------------------------|---------|
| 48 h para detectar bugs con tráfico real | Durante esas 48 h **rollback sigue siendo posible** pero con pérdida de msgs en Railway |
| Vercel intacto como plan B | No añade validación técnica vs corte directo + 1 h observación — ya validaste staging |
| Menos presión psicológica | Más días con dos stacks “vivos” (coste Railway + confusión operativa) |

**Conclusión:** la “observación paralela” **útil** ya ocurrió en `dumo-crm-production.up.railway.app`. Para prod, el trade-off real es **corte directo + 30–60 min observación** vs **corte directo + 48 h antes de desactivar Vercel** — no un tercer modo técnico sin split-brain.

---

## 4. Checklist del día del corte (orden exacto)

Marca cada paso. **Zona de reversión** indicada en cada bloque.

### Fase previa (T-24 h a T-1 h) — ✅ Reversible sin fricción

- [ ] Confirmar sesión QR **CONNECTED** en bridge (`GET https://dumo-production.up.railway.app/health`)
- [ ] Confirmar Redis + worker: `GET https://dumo-crm-production.up.railway.app/api/system/queue` → `enabled: true`
- [ ] Confirmar `AUTH_SECRET` idéntico Vercel ↔ Railway CRM
- [ ] Confirmar `WEB_QR_WEBHOOK_SECRET` (Vercel/Railway CRM) = `DUMO_WEBHOOK_SECRET` (bridge)
- [ ] Bajar TTL DNS a **300 s** (5 min) si controlas el dominio — facilita rollback
- [ ] Avisar al equipo: ventana de corte + URL de rollback (`du-mo.vercel.app`)
- [ ] Tener abiertos: Railway dashboard, Vercel dashboard, terminal con repo

### T-0 — Backup e import — ✅ Reversible (prod intacto)

| # | Paso | Detalle |
|---|------|---------|
| 1 | **Backup fresco Supabase** | Comando sección 1 → anotar path + conteos |
| 2 | **Copia de seguridad del JSON** | Fuera del laptop |
| 3 | **Import `--fresh` a Postgres Railway** | `railway-postgres-import.mjs --file … --fresh` |
| 4 | **Verify conteos** | Railway `/api/system/db` ≥ backup; revisar `lead_messages` |
| 5 | **Smoke staging URL** | Login admin + asesora en `dumo-crm-production.up.railway.app` |

**⛔ Si falla verify → STOP. No continuar. Prod sigue en Vercel.**

### T+1 — Preparar Railway para URL pública — ✅ Reversible

| # | Paso | Detalle |
|---|------|---------|
| 6 | Railway CRM `NEXT_PUBLIC_APP_URL` | `https://du-mo.vercel.app` (dominio final usuarios) |
| 7 | Railway CRM `REDIS_URL` | Ya `${{Redis.REDIS_URL}}` — verificar |
| 8 | Redeploy CRM si cambiaste env | `railway redeploy --service dumo-crm` |
| 9 | Custom domain en Railway (si aplica) | `du-mo.vercel.app` o dominio propio → servicio `dumo-crm` |

### T+2 — Webhook QR — ⚠️ Punto de fricción (split-brain si DNS aún en Vercel)

| # | Paso | Detalle |
|---|------|---------|
| 10 | Bridge `DUMO_WEBHOOK_URL` | `https://du-mo.vercel.app/api/web-qr/webhook` **→** `https://<dominio-final>/api/web-qr/webhook` (Railway CRM tras DNS, o URL Railway temporal si cortas DNS después) |
| 11 | Redeploy bridge | Servicio **DuMo** |
| 12 | **Mensaje QR real** al número conectado | Debe aparecer en Leads del CRM que recibe webhook |
| 13 | **Respuesta outbound** desde Leads | Cliente recibe en WhatsApp |

**🔶 A partir del paso 10:** mensajes QR nuevos van al CRM que recibe el webhook. Si DNS aún apunta a Vercel, **usuarios en Vercel no verán esos mensajes**. Minimizar tiempo entre paso 10 y paso 14.

**Reversión:** Escenario B (5–10 min).

### T+3 — DNS — 🔴 “No hay vuelta atrás fácil” (datos nuevos solo en Railway)

| # | Paso | Detalle |
|---|------|---------|
| 14 | **Cortar DNS** | `du-mo.vercel.app` → Railway CRM (CNAME/custom domain) |
| 15 | Esperar propagación | 5–15 min (TTL 300) |
| 16 | Smoke post-DNS | `node scripts/verify-web-qr-cutover.mjs https://du-mo.vercel.app` |
| 17 | Login + Leads + 1 chat WABA legado (solo lectura) | Manual |
| 18 | WebSocket | 2 pestañas — mensaje sin F5 |
| 19 | Cola | `GET /api/system/queue` — sin `failed` creciendo |

**🔴 A partir del paso 14:** tráfico de usuarios + (si webhook ya apunta aquí) datos nuevos en Railway Postgres. Rollback Escenario C devuelve UI a Vercel/Supabase pero **pierde** msgs de la ventana Railway.

**Reversión:** Escenario C (15–25 min típico).

### T+4 — Post-corte (30–60 min) — Observación

- [ ] Monitorear Railway logs CRM + bridge
- [ ] Confirmar asesoras pueden operar sin F5
- [ ] **No** desactivar Vercel ni Supabase aún
- [ ] Anotar hora “corte declarado exitoso”

### T+7 días — Limpieza (solo tras estabilidad)

- [ ] Opcional: pausar deploy Vercel CRM (mantener proyecto)
- [ ] Documentar conteos finales Railway vs último backup Supabase
- [ ] Archivar backup del día del corte

---

## 5. Variables a tocar el día del corte (referencia)

| Servicio | Variable | Valor actual (prod) | Valor post-corte |
|----------|----------|---------------------|------------------|
| **Bridge** `DuMo` | `DUMO_WEBHOOK_URL` | `https://du-mo.vercel.app/api/web-qr/webhook` | `https://du-mo.vercel.app/api/web-qr/webhook` *(mismo hostname, backend Railway vía DNS)* |
| **CRM Railway** `dumo-crm` | `DATABASE_URL1` | `${{Postgres.DATABASE_URL}}` | Sin cambio |
| **CRM Railway** | `NEXT_PUBLIC_APP_URL` | `*.up.railway.app` | `https://du-mo.vercel.app` |
| **CRM Railway** | `REDIS_URL` | `${{Redis.REDIS_URL}}` | Sin cambio |
| **Vercel** | `DATABASE_URL1` | Supabase | **Dejar sin cambiar** hasta estabilidad (facilita rollback) |
| **DNS** | `du-mo.vercel.app` | Vercel | Railway CRM |

---

## 6. Comandos de smoke post-corte

```powershell
# Diagnóstico QR + BD + bridge
node scripts/verify-web-qr-cutover.mjs https://du-mo.vercel.app

# BD + cola
curl.exe -s https://du-mo.vercel.app/api/system/db
curl.exe -s https://du-mo.vercel.app/api/system/queue

# WebSocket + cola (opcional, desde máquina local)
# AUTH_SECRET=... WEB_QR_WEBHOOK_SECRET=... node scripts/realtime-multi-session-test.mjs
# WEB_QR_WEBHOOK_SECRET=... node scripts/inbound-queue-burst-test.mjs
```

---

## 7. Decisión pendiente (tu lado)

- [ ] **Corte directo** (recomendado): ventana única ~45–90 min, observación 30–60 min, rollback plan B/C documentado arriba.
- [ ] **48 h observación post-corte**: mismo corte DNS+webhook; mantener Vercel desplegado pero sin tráfico; no desactivar nada 48 h.

**No ejecutar Fase 7 hasta tu luz verde explícita.**

---

## 8. Corte ejecutado — smoke tests prod (2026-08-08/09)

**Hora corte declarado exitoso:** `2026-08-09T02:40:45Z` — sábado 8 ago 2026, **9:40 PM UTC-5 (Colombia)**

| Paso | Prueba | Resultado |
|------|--------|-----------|
| 1 | `verify-web-qr-cutover.mjs` → `du-mo.vercel.app` | ✅ PASS — postgres, QR CONNECTED, webhook OK |
| 2 | Login auth (401 + login real + bandeja) | ✅ PASS |
| 3 | QR inbound real (`SMOKE-QR-IN` → `webqr:573148127388`) | ✅ PASS |
| 4 | QR outbound real (`SMOKE-QR-OUT` → celular cliente) | ✅ PASS |
| 5 | `realtime-multi-session-test.mjs` (3 sockets) | ✅ PASS — exit 0 |

**Post-corte pendiente (T+7 días):** mantener Vercel desplegado; no desactivar Supabase; observación operativa 30–60 min recomendada el día del corte.
