# DuMo CRM

Plataforma comercial interna (Leads, ventas, WhatsApp Web QR).

## Producción (post-corte Railway — 2026-08-08)

| Item | Valor |
|------|--------|
| **URL usuarios** | https://du-mo.vercel.app |
| **Backend activo** | Railway CRM + Postgres (`dumo-crm-production.up.railway.app`) |
| **Corte declarado exitoso** | 2026-08-09T02:40:45Z (8 ago 2026, 9:40 PM UTC-5) |

### ⚠️ No desactivar Vercel antes del **15 de agosto de 2026**

Mantener el proyecto **Vercel desplegado y activo como mínimo 7 días** tras el corte (red de seguridad / rollback).  
**No** pausar deploys, **no** borrar el proyecto, **no** cambiar `DATABASE_URL1` en Vercel hasta cumplir esa ventana.

Detalle completo: [`docs/railway-phase-7-cutover.md`](docs/railway-phase-7-cutover.md) (secciones rollback post-corte y T+7 días).

## Migración Railway (Fases 3–7)

| Fase | Doc |
|------|-----|
| Postgres | [`docs/railway-phase-3-postgres.md`](docs/railway-phase-3-postgres.md) |
| CRM deploy | [`docs/railway-phase-4-crm.md`](docs/railway-phase-4-crm.md) |
| WebSocket | [`docs/railway-phase-5-websocket.md`](docs/railway-phase-5-websocket.md) |
| Cola BullMQ | [`docs/railway-phase-6-queue.md`](docs/railway-phase-6-queue.md) |
| Corte prod | [`docs/railway-phase-7-cutover.md`](docs/railway-phase-7-cutover.md) |

Scripts útiles: `scripts/verify-web-qr-cutover.mjs`, `scripts/supabase-railway-diff.mjs`, `scripts/backup-db-supabase.mjs`.
