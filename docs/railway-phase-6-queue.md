# Fase 6 — Redis + BullMQ (webhooks async)

## Objetivo

Los webhooks QR (y WABA legado) responden **200 OK de inmediato** encolando el payload crudo; un worker BullMQ persiste en Postgres y emite WebSocket al terminar.

## Infraestructura Railway

- Proyecto: `ample-adventure`
- Redis addon en red privada con `dumo-crm`
- Variable en `dumo-crm`: `REDIS_URL=${{Redis.REDIS_URL}}`

Sin `REDIS_URL`, el CRM procesa inline (comportamiento anterior).

## Componentes

| Archivo | Rol |
|---------|-----|
| `src/server/queue/redis.ts` | Conexión ioredis |
| `src/server/queue/inbound-queue.ts` | Encolar jobs |
| `src/server/queue/inbound-worker.ts` | Consumidor BullMQ (concurrency=1, orden FIFO) |
| `src/instrumentation.ts` | Arranca worker al iniciar Next |
| `GET /api/system/queue` | Diagnóstico de cola |

## Webhooks

- **QR** `POST /api/web-qr/webhook` → `enqueueWebQrInbound` → `{ ok: true, queued: true }`
- **WABA** `POST /api/whatsapp/webhook` → encola y responde `EVENT_RECEIVED` sin esperar persistencia

## Pruebas

```bash
WEB_QR_WEBHOOK_SECRET=... node scripts/inbound-queue-burst-test.mjs
AUTH_SECRET=... WEB_QR_WEBHOOK_SECRET=... node scripts/realtime-multi-session-test.mjs
```
