# DuMo Web QR Bridge

Proceso **persistente** con Baileys. DuMo (Vercel) no puede mantener sockets WhatsApp Web — este servicio corre aparte.

## Despliegue (Railway / Fly / VPS)

```bash
cd services/web-qr-bridge
npm install
npm start
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto HTTP (default 8787) |
| `BRIDGE_SECRET` | Secreto compartido con DuMo (`WEB_QR_BRIDGE_SECRET`) |
| `DUMO_WEBHOOK_URL` | `https://du-mo.vercel.app/api/web-qr/webhook` |
| `DUMO_WEBHOOK_SECRET` | Mismo valor que `WEB_QR_WEBHOOK_SECRET` en Vercel |
| `SESSIONS_DIR` | Carpeta para credenciales Baileys (volumen persistente) |

## DuMo (Vercel)

```
WEB_QR_BRIDGE_URL=https://tu-bridge.railway.app
WEB_QR_BRIDGE_SECRET=<mismo que BRIDGE_SECRET>
WEB_QR_WEBHOOK_SECRET=<secreto para inbound>
NEXT_PUBLIC_APP_URL=https://du-mo.vercel.app
```

## Flujo

1. Admin → `/admin/web-qr` → Agregar línea → Generar QR
2. DuMo API → POST bridge `/sessions`
3. Bridge Baileys emite QR → admin escanea
4. Mensajes entrantes → bridge → POST `/api/web-qr/webhook` → bandeja Leads (`webqr:{tel}`)
5. Respuesta asesora → `leads.service` → bridge `/send`

## Aislamiento WABA

Este módulo **no modifica** `/api/whatsapp/*` ni `connected_numbers`. Las conversaciones QR usan ID `webqr:573001234567`.
