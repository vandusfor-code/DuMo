# Fase 5 — WebSocket (Socket.io) en Railway staging

## Objetivo

Tiempo real en la bandeja de leads: mensajes nuevos y cambios de conversación sin refrescar, con polling de respaldo cada 45 s.

## Arquitectura

- **`server.mjs`**: servidor HTTP custom que envuelve Next.js y comparte proceso con Socket.io.
- **`realtime/socket-server.mjs`**: autenticación por cookie `dumo_session` (misma firma HMAC que el CRM) y salas:
  - `admin:leads` → `administrador` y `supervisor` (ven todo)
  - `advisor:{userId}` → `asesora` (solo conversaciones asignadas a esa asesora)
- **`src/server/realtime/emit.ts`**: emite desde repositorios vía `globalThis.__dumoIo`.
- **`src/providers/realtime-provider.tsx`**: cliente Socket.io; invalida React Query al recibir eventos.

## Eventos

| Evento | Cuándo |
|--------|--------|
| `leads:message:new` | Tras `saveMessage()` |
| `leads:conversation:updated` | `markRead`, asignación manual, auto-asignación, placeholder actualizado |

## Polling de respaldo

Hooks de bandeja/mensajes usan `REALTIME_FALLBACK_POLL_MS = 45_000` (antes 3–10 s).

## Deploy (staging)

El `Dockerfile` arranca con `node server.mjs` (no `server.js` standalone).

```bash
git push origin feat/railway-phase-3
# Railway redeploy automático en dumo-crm
```

## Prueba multi-sesión

Con `AUTH_SECRET` del servicio Railway:

```bash
AUTH_SECRET=... node scripts/realtime-multi-session-test.mjs
```

Opcional:

- `DUMO_CRM_URL` — default `https://dumo-crm-production.up.railway.app`
- `TEST_ADMIN_USER_ID`, `TEST_ADVISOR_USER_ID`, `TEST_CONVERSATION_ID`

El script abre 3 sockets (2 admin + 1 asesora), dispara un webhook QR simulado y verifica que las sesiones admin reciben el evento.

## Manual (navegador)

1. Abrir 2 pestañas en `/admin/leads` (admin) y 1 en `/dashboard` (asesora).
2. Simular mensaje: `POST /api/web-qr/webhook` o enviar desde otra pestaña.
3. Confirmar que la bandeja se actualiza sin F5 en las 3 pestañas (admin siempre; asesora solo si la conversación está asignada).

## Producción

**No aplicar en Vercel/prod hasta Fase 7.** Socket.io requiere proceso always-on (Railway).
