# Fase 4 — CRM always-on en Railway (staging paralelo)

**Objetivo:** DuMo Next.js en Railway, apuntando al **Postgres de prueba** (Fase 3). **No tocar Vercel ni DNS.**

| Componente | Dónde |
|------------|--------|
| CRM Next.js | Servicio `dumo-crm` (repo root) |
| Postgres | Servicio `Postgres` (392 filas, backup 2026-08-08) |
| Bridge QR | Servicio `DuMo` en `services/web-qr-bridge` — **sin cambios** |
| Media | Supabase Storage (mismo bucket que prod) |

**Sin volumen** en el CRM — ver `docs/RAILWAY-VOLUME-PERSISTENCE.md`.

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
| `WHATSAPP_*` | Igual que Vercel |
| `MIGRATE_DB_SECRET` | Igual que Vercel |

**No copiar:** `VERCEL_*`, `TURBO_*`, `NX_DAEMON`.

---

## Conexión BD always-on

`src/server/db/client.ts` usa **singleton a nivel de módulo** (`sqlSingleton`) — correcto para proceso long-running. Migraciones DDL deshabilitadas en prod (`runtimeMigrationsEnabled: false`).

---

## QR inbound en staging (limitación paralela)

El bridge envía webhooks a **`DUMO_WEBHOOK_URL` de producción (Vercel)**. Para no romper prod en Fase 4:

- **Outbound QR:** CRM Railway → bridge `/send` ✅
- **Inbound QR en Railway DB:** simular `POST /api/web-qr/webhook` o esperar Fase 7 (webhook al CRM Railway)

---

## Checklist de pruebas (dominio Railway)

- [ ] Login admin
- [ ] Login asesora
- [ ] WABA entrante (si dulabs puede reenviar a URL staging — opcional)
- [ ] WABA saliente + imágenes
- [ ] QR saliente (bridge)
- [ ] QR entrante (webhook simulado o nota de limitación)
- [ ] Gestión comercial / leads / gestiones

---

## Fase 7

Ver **`docs/railway-phase-7-cutover.md`** — backup fresco obligatorio antes del corte; no reutilizar backup 2026-08-08.
