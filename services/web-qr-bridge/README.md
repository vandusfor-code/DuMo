# DuMo Web QR Bridge

Proceso **persistente** con Baileys. DuMo (Vercel) no puede mantener sockets WhatsApp Web — este servicio corre aparte.

## Despliegue (Railway / Fly / VPS)

**Node.js 20+** obligatorio (`@whiskeysockets/baileys` 7.x).

En Railway:
- **Root Directory:** `services/web-qr-bridge` (no el repo raíz — si apuntas a la raíz, el build fallará o desplegará Next.js por error)
- **Node:** 20+ vía `.nvmrc` / `engines` / `nixpacks.toml` (o variable `NIXPACKS_NODE_VERSION=20`)
- **Volumen:** montar en `/data/sessions`, env `SESSIONS_DIR=/data/sessions`

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
| `SUPABASE_URL` | URL del proyecto Supabase (o `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **requerido para audio entrante QR** |
| `SUPABASE_STORAGE_BUCKET` | Bucket de media (default `dumo-media`) |
| `DUMO_COMPANY_ID` | ID tenant para rutas storage (default `company-default`) |

### Audio entrante (Fase A)

Cuando llega una nota de voz o archivo de audio por QR, el bridge:

1. Descarga el binario con Baileys (`downloadMediaMessage`)
2. Lo sube a Supabase Storage (`companies/{companyId}/chat/inbound/webqr:{tel}/…`)
3. Reenvía el webhook a DuMo con `type: "audio"` y `mediaUrl` público

**Prueba curl (sin celular):** `POST /debug/supabase-audio-upload` con header `x-web-qr-bridge-secret`.

```bash
curl -sS -X POST "$BRIDGE_URL/debug/supabase-audio-upload" \
  -H "Content-Type: application/json" \
  -H "x-web-qr-bridge-secret: $BRIDGE_SECRET" \
  -d '{"phone":"573001234567"}'
```

**Prueba real:** envía un audio al número QR conectado; verifica en logs `audio QR subido a Supabase` y que el webhook incluye `mediaUrl`.

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

## Migrar un número desde dulabs (WABA) a QR

1. **Railway:** volumen en `/data/sessions`, `SESSIONS_DIR=/data/sessions`, secrets alineados con Vercel.
2. **DuMo:** `/admin/web-qr` → Agregar línea → Generar QR → escanear → estado **Conectado**.
3. **Probar** (con dulabs aún activo):
   - Mensaje de prueba **al** número desde otro celular → debe entrar en Leads como `webqr:573…`
   - Responder desde DuMo → el cliente lo recibe
4. **Verificar:** `GET https://du-mo.vercel.app/api/system/web-qr` → `readyForQr: true`
   - O local: `node scripts/verify-web-qr-cutover.mjs`
5. **Cortar dulabs:** desactivar reenvío webhook a DuMo (evita el mismo chat en dos hilos).
6. **Asesoras:** chats nuevos van al hilo `webqr:…`; historial WABA viejo sigue en hilo `573…` (sin migrar).

## Aislamiento WABA

Este módulo **no modifica** `/api/whatsapp/*` ni `connected_numbers`. Las conversaciones QR usan ID `webqr:573001234567`.
