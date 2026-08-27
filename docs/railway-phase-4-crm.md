# Fase 4 — CRM always-on en Railway (staging paralelo)

**Objetivo:** DuMo Next.js en Railway, apuntando al **Postgres de prueba** (Fase 3). **No tocar Vercel ni DNS.**

| Componente | Dónde |
|------------|--------|
| CRM Next.js | Servicio `dumo-crm` |
| Postgres | Servicio `Postgres` (392 filas, backup 2026-08-08) |
| Bridge QR | Servicio `DuMo` en `services/web-qr-bridge` — **sin cambios** |
| Media | Supabase Storage (mismo bucket que prod) |

**Sin volumen** en el CRM — ver `docs/RAILWAY-VOLUME-PERSISTENCE.md`.

**URL staging:** https://dumo-crm-production.up.railway.app

---

## Alcance de canales (2026-08-08)

| Canal | Estado | Notas |
|-------|--------|-------|
| **WhatsApp Web (QR)** | **Activo — prioridad #1** | Único flujo para mensajes nuevos en producción |
| **WABA (Cloud API)** | **Legado — solo lectura** | Chats/mensajes viejos visibles en Leads; **no** enviar/recibir mensajes nuevos por esta vía |
| **Messenger** | Legado / según uso | Historial en BD si existía |

Las pruebas de Fase 4 **no bloquean** por WABA outbound/inbound en staging. Lo que importa: historial WABA consultable + QR operativo.

---

## Variables de entorno

Copiar de Vercel producción → Railway `dumo-crm`. Checklist: `docs/railway-migration-env-checklist.md`.

| Variable | Valor en Fase 4 |
|----------|-----------------|
| `DATABASE_URL1` | `${{Postgres.DATABASE_URL}}` (interna Railway) |
| `AUTH_SECRET` | **Idéntico a Vercel** |
| `NEXT_PUBLIC_APP_URL` | URL temporal `*.up.railway.app` del servicio CRM |
| `WEB_QR_BRIDGE_*` | Igual que Vercel (mismo bridge) |
| `SUPABASE_*` | Igual que Vercel (storage) |
| `MIGRATE_DB_SECRET` | Igual que Vercel |

**WABA (legado):** `WHATSAPP_TOKEN`, `META_*` opcionales — solo si algún endpoint legacy lo exige. **`WHATSAPP_FORWARD_SECRET`** solo para reenvío dulabs→DuMo (ver abajo). **`WHATSAPP_PHONE_NUMBER_ID`** ya no aplica sin números WABA activos.

**No copiar:** `VERCEL_*`, `TURBO_*`, `NX_DAEMON`.

### `WHATSAPP_FORWARD_SECRET` — qué es y si regenerar

**No es de Meta.** Es un secreto **compartido entre dulabs y DuMo**, generado por ustedes:

| Uso en DuMo | Header / ruta |
|-------------|----------------|
| Webhook reenviado desde dulabs | `POST /api/whatsapp/webhook` — header `X-DuMo-Forward-Secret` |
| Registro de número desde dulabs | `POST /api/whatsapp/register-number` — mismo header |

DuMo compara el header con `process.env.WHATSAPP_FORWARD_SECRET` (`hasValidForwardSecret` en `src/app/api/whatsapp/webhook/route.ts`).

**Al retirar WABA:** si dulabs **deja de reenviar** webhooks a DuMo, esta variable **no es necesaria** para operación QR ni para **leer** historial viejo. Regenerarla en Vercel/Railway **no afecta Meta**; solo rompería el reenvío dulabs hasta que actualices el mismo valor en dulabs (irrelevante si ya no usas esa vía).

---

## Conexión BD always-on

`src/server/db/client.ts` usa **singleton a nivel de módulo** (`sqlSingleton`) — correcto para proceso long-running. Migraciones DDL deshabilitadas en prod (`runtimeMigrationsEnabled: false`).

---

## QR inbound en staging (limitación paralela)

El bridge envía webhooks a **`DUMO_WEBHOOK_URL` de producción (Vercel)** hasta Fase 7. En Fase 4:

- **Outbound QR:** CRM Railway → bridge `/send` ✅
- **Inbound QR en Railway DB:** webhook simulado o tráfico real vía Vercel prod — en staging Postgres, simular `POST /api/web-qr/webhook`

---

## Checklist de pruebas (dominio Railway)

### Obligatorio (Fase 4 → Fase 5)

- [x] Deploy + `/api/system/db` conectado
- [x] Bandeja Leads: conversaciones WABA legado visibles (solo lectura)
- [x] Historial mensajes WABA consultable por conversación
- [ ] Login admin / asesora (credenciales reales)
- [x] QR diagnóstico (`/api/system/web-qr` → `readyForQr`)
- [x] QR saliente (bridge `/send`)
- [x] QR entrante (webhook simulado en staging)
- [ ] Gestión comercial / gestiones (con sesión)

### No bloqueante (WABA retirado)

- ~~WABA entrante en staging~~ — no requerido
- ~~WABA saliente + imágenes~~ — no requerido
- ~~`WHATSAPP_FORWARD_SECRET` en Railway~~ — opcional si dulabs ya no reenvía

---

## Fase 7

Ver **`docs/railway-phase-7-cutover.md`** — backup fresco obligatorio antes del corte; no reutilizar backup 2026-08-08.
