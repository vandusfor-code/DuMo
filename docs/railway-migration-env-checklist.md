# DuMo — Checklist de variables de entorno (Fase 0)

Copiar de Vercel → Railway CRM (mismo valor, especialmente `AUTH_SECRET`).

## Base de datos
| Variable | Notas |
|----------|--------|
| `DATABASE_URL1` | Postgres URI. **Pooler puerto 6543** (transaction mode), no 5432 directo |
| `MIGRATE_DB_SECRET` | Secreto para `POST /api/system/migrate` y CI |

## Auth (propio — NO Supabase Auth)
| Variable | Notas |
|----------|--------|
| `AUTH_SECRET` | **Mismo valor** o todas las sesiones activas se invalidan |

## Supabase Storage (mantener en este sprint)
| Variable | Notas |
|----------|--------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor, storage |
| `SUPABASE_STORAGE_BUCKET` | Default `dumo-media` |

## WhatsApp WABA (dulabs / Meta)
| Variable | Notas |
|----------|--------|
| `WHATSAPP_FORWARD_SECRET` | Webhook dulabs |
| `WHATSAPP_TOKEN` | Envío Meta |
| `WHATSAPP_PHONE_NUMBER_ID` | |
| `META_APP_SECRET` | Firma webhook |
| `WHATSAPP_PHONE_NUMBER_IDS` | Opcional filtro |

## WhatsApp Web QR (Railway bridge)
| Variable | Notas |
|----------|--------|
| `WEB_QR_BRIDGE_URL` | Raíz bridge, sin `/health` |
| `WEB_QR_BRIDGE_SECRET` | = Railway `BRIDGE_SECRET` |
| `WEB_QR_WEBHOOK_SECRET` | = Railway `DUMO_WEBHOOK_SECRET` |
| `NEXT_PUBLIC_APP_URL` | URL pública del CRM |

### Volumen persistente (obligatorio)
| Railway | Valor |
|---------|--------|
| Volumen montado en | `/data/sessions` |
| Env `SESSIONS_DIR` | `/data/sessions` |

Sin volumen, cada redeploy/reinicio borra las credenciales Baileys (`persistedSessions: 0` → hay que escanear QR de nuevo). Ver `docs/RAILWAY-VOLUME-PERSISTENCE.md`.

## App
| Variable | Notas |
|----------|--------|
| `NEXT_PUBLIC_APP_TIMEZONE` | Opcional `America/Bogota` |

## Google Sheets (legacy / mock fallback)
| Variable | Notas |
|----------|--------|
| `GOOGLE_*` | Solo si aún se usa modo sheets |

## Migraciones (Fase 1)
| Variable | Notas |
|----------|--------|
| `ALLOW_RUNTIME_MIGRATIONS` | `1` solo en dev local si hace falta |
| Producción | **No definir** — DDL solo vía `npm run db:migrate` / CI |

## Pendiente Fase 8
Imágenes entrantes por WhatsApp Web (QR) no se persisten — ver `docs/PENDING-QR-MEDIA.md`.
