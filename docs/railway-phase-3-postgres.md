# Fase 3 — Postgres de prueba en Railway

**Objetivo:** Postgres aislado en el mismo proyecto Railway que el bridge. **No tocar `DATABASE_URL1` de producción (Supabase).**

El CRM en Fase 4 usará **Postgres + Redis + Supabase Storage** — **sin volumen local** (ver `docs/RAILWAY-VOLUME-PERSISTENCE.md`). Solo el bridge Baileys necesita disco en `/data/sessions`.

---

## 1. Crear Postgres en Railway (dashboard)

1. Proyecto Railway (mismo que bridge `dumo-production`)
2. **+ New** → **Database** → **PostgreSQL**
3. Nombre sugerido: `dumo-postgres-staging` o `Postgres`
4. Esperar estado **Active**

## 2. Obtener URI de conexión

En el servicio Postgres → **Variables** o **Connect**:

| Variable Railway | Uso |
|------------------|-----|
| `DATABASE_URL` o `DATABASE_PRIVATE_URL` | Import/migrate desde tu máquina (preferir **private** si usas Railway CLI link) |
| `DATABASE_PUBLIC_URL` | Conexión externa (SSL) |

Copia la URI **directa** (puerto **5432**, no pooler).

## 3. Config local (no commitear)

Crea `.env.railway.postgres.local`:

```env
RAILWAY_TEST_DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/railway
```

Opcional para comparar con producción en verify:

```env
# ya en .env.vercel.production
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 4. Ejecutar pipeline Fase 3

```powershell
# 1) Esquema DDL (mismas migraciones que DuMo)
node --env-file=.env.railway.postgres.local scripts/railway-postgres-migrate.mjs

# 2) Importar backup
node --env-file=.env.railway.postgres.local scripts/railway-postgres-import.mjs --file backups/dumo-backup-2026-08-08.json

# 3) Verificar integridad vs backup
node --env-file=.env.railway.postgres.local --env-file=.env.vercel.production scripts/railway-postgres-verify.mjs
```

## 5. Conteos esperados (backup 2026-08-08)

| Tabla | Filas backup |
|-------|----------------|
| users | 5 |
| lead_conversations | 63 |
| lead_messages | 280 |
| lead_gestiones | 27 |
| crm_clients | 3 |
| media_assets | 4 |
| connected_numbers | 1 |
| app_config | 9 |
| **Total** | **392** |

**Producción hoy** puede tener **más** filas en `lead_conversations` / `lead_messages` (tráfico QR real). Eso no es discrepancia del import — el Postgres de prueba debe **coincidir con el backup**, no con prod en vivo.

> **Fase 7:** este snapshot (392 filas, 2026-08-08) es solo para staging. El corte final requiere backup fresco — ver `docs/railway-phase-7-cutover.md`.

## 6. Qué NO hacer en Fase 3

- ❌ Cambiar `DATABASE_URL1` en Vercel producción
- ❌ Montar volumen en el futuro servicio CRM (solo bridge)
- ❌ Apuntar el CRM en producción a Railway Postgres hasta Fase 4 explícita

---

## CLI alternativa (requiere `railway login`, Node 20+)

```bash
cd services/web-qr-bridge
railway link
railway add --database postgres --json
railway variables --json
```
