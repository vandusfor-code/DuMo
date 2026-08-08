# Pendiente — persistencia de media en WhatsApp Web (QR)

**No forma parte del sprint de estabilización Railway.**

Hoy el bridge Baileys (`services/web-qr-bridge/src/index.js`) detecta imágenes pero **no envía `mediaUrl`** al webhook de DuMo. El handler (`src/server/web-qr/inbound.ts`) guarda solo texto placeholder (`📷 Imagen`) sin `mediaAssetId` ni upload a Supabase Storage.

PDF, audio y documentos por QR tampoco se persisten.

Sprint futuro: descargar media en el bridge o en DuMo, subir a Supabase Storage (o S3), guardar `media_asset_id` en `lead_messages`.
