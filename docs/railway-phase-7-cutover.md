# Fase 7 — Corte final a Railway (producción)

**Estado:** planificado — no ejecutar hasta Fases 4–6 completas y ventana de corte acordada.

---

## ⚠️ Backup fresco obligatorio (NO usar el de Fase 3)

El Postgres de prueba en Railway (Fase 3) se cargó con **`dumo-backup-2026-08-08.json`** — **392 filas**, snapshot del **8 de agosto**.

**Producción real (Supabase) sigue creciendo** con tráfico QR/WABA desde entonces. Al momento de Fase 4 el delta ya era visible (p. ej. ~73 conversaciones / ~300 mensajes vs 63/280 del backup). **Ese gap aumenta cada día.**

### Regla para Fase 7

| ❌ No hacer | ✅ Obligatorio |
|------------|----------------|
| Reutilizar `dumo-backup-2026-08-08.json` como fuente del corte | Tomar **backup fresco** de Supabase **inmediatamente antes** del corte |
| Asumir que el Postgres de staging tiene datos al día | Importar ese backup nuevo al Postgres de producción Railway |
| Cortar DNS sin verificar conteos post-import | Verificar integridad: conteos Railway ≥ backup fresco, fila por fila en tablas críticas |

### Pipeline mínimo pre-corte

```powershell
# 1) Backup en vivo (minutos antes del corte)
node scripts/backup-db-supabase.mjs
# → backups/dumo-backup-YYYY-MM-DD.json

# 2) Import al Postgres Railway de producción
node --env-file=.env.railway.postgres.prod.local scripts/railway-postgres-import.mjs --file backups/dumo-backup-YYYY-MM-DD.json --fresh

# 3) Verificar vs backup recién tomado (NO vs backup viejo)
node --env-file=.env.railway.postgres.prod.local scripts/railway-postgres-verify.mjs

# 4) Solo entonces: cambiar DATABASE_URL1 / DNS / webhooks bridge
```

### Tablas que más crecen entre Fase 3 y Fase 7

- `lead_conversations`
- `lead_messages`
- `whatsapp_channels` / `web_qr_sessions` (si hay actividad QR post-backup)

Un mensaje perdido en el corte = cliente sin historial. **El backup del 8-ago es válido solo para staging/Fase 4, nunca para el corte final.**

---

## Otros pasos Fase 7 (recordatorio)

- [ ] Backup fresco + verify (arriba)
- [ ] Apuntar `DATABASE_URL1` del CRM Railway al Postgres prod
- [ ] Actualizar `NEXT_PUBLIC_APP_URL` y webhooks (`DUMO_WEBHOOK_URL` en bridge, dulabs forward)
- [ ] Ventana de corte DNS (du-mo.vercel.app → Railway)
- [ ] Smoke test post-corte: login, WABA, QR, leads
- [ ] Mantener Supabase/Vercel como rollback temporal hasta estabilidad confirmada
