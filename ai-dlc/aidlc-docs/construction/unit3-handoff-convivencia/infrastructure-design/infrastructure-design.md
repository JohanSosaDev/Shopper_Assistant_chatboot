# Infrastructure Design — Unit 3: Handoff & Despliegue Gradual

> **MVP scope**: solo `dev-local` environment. Delta vs Units 1+2: 1 contenedor nuevo (mailhog dev-only), 6 env vars nuevas, 5 migraciones nuevas (0007-0011), AlertEvaluator job registrado al boot, backup extendido a 3 tablas U3.
> **Plan Q&A ID**: Q1=A mailhog siempre en compose, Q2=A Slack optional, Q3=A backup on-demand extendido, Q4=A Demo Day conservadora.

---

## 1. Deployment target — sin cambios

Mismo `dev-local` (Docker Compose en laptop dev) heredado de Units 1 y 2. Unit 3 NO introduce nuevos environments.

---

## 2. Compute infrastructure — 1 contenedor nuevo (mailhog)

| Container | Imagen | Resources | Origen |
|---|---|---|---|
| `hermes` | Node 20 alpine + build local | 1 cpu / 1 GiB | U1 |
| `postgres` | Postgres 16 + pgvector | 1 cpu / 1 GiB | U1 |
| **`mailhog`** | `mailhog/mailhog:latest` | 0.1 cpu / 64 MiB | **U3 — NUEVO** |

**Resource budget total**: ~2.1 cpu + ~2 GiB RAM laptop dev. Sigue dentro del budget ~4 GiB del NFR-D U1 §11.

**Por qué mailhog**: dev-only SMTP catcher; expone web UI en `localhost:8025` para inspeccionar emails sin enviarlos a `cx@patprimo.com` real. Cero risk de spam accidental durante dev/testing.

---

## 3. Storage delta — 5 tablas nuevas + 1 extensión

Las 5 tablas U3 viven en el mismo volume `hermes_pg_data`:

| Tabla | Tipo | Growth estimate (MVP) |
|---|---|---|
| `system_config` | single-row config | 1 row siempre (CHECK `id=1`) |
| `system_config_audit` | append-only audit | <50 rows/mes |
| `handoff_ticket` | append-only payload | ~10k rows/año a full ramp |
| `alert_rules` | CRUD | 5 builtin + ≤10 custom esperado |
| `alert_events` | append-only events | ~120 rows/día (≤5 alertas/hora pico) |

**Extensión** a `turn_log_audit` (de U1): 5 columnas nuevas nullable + 2 índices nuevos. Sin impact en growth.

**Volume**: mismo `hermes_pg_data`. Total estimado U1+U2+U3 después de 6 meses MVP: <50 MB.

---

## 4. Environment variables delta (nuevas en Unit 3)

| Variable | Required | Default | Source | Notas |
|---|---|---|---|---|
| `SMTP_HOST` | sí | `mailhog` | `.env` | Service name del contenedor; en Fase 2 prod = SMTP corporativo |
| `SMTP_PORT` | sí | `1025` | `.env` | mailhog default; Fase 2 prod = 465 o 587 |
| `SMTP_SECURE` | no | `false` | `.env` | Plain en dev (mailhog); `true` en Fase 2 prod con TLS |
| `SMTP_FROM` | sí | `hermes@patprimo.local` | `.env` | Header `From:`; Fase 2 prod = `hermes@patprimo.com.co` o similar |
| `SLACK_WEBHOOK_URL` | **no (optional)** | (vacío) | `.env` | Q2=A — graceful degradation si vacío; alertas siguen persistiendo en `alert_events` |
| `ALERT_EVALUATOR_LOCK_ID` | no | `47821001` | `.env` | int único para `pg_try_advisory_lock`; cambiar si conflicto con otros jobs en Fase 2 |

`ROLLOUT_SALT` no es env var — se genera en migration 0007 con `gen_random_bytes(32)` y queda en `system_config.rollout_salt`. Si se requiere rotar (caso raro), se hace UPDATE manual desde BM UI con `reason` obligatorio.

**Agregadas al Zod schema** en `hermes/src/config/env.ts`:

```ts
SMTP_HOST: z.string().min(1),
SMTP_PORT: z.coerce.number().int().min(1).max(65535),
SMTP_SECURE: z.coerce.boolean().default(false),
SMTP_FROM: z.string().email(),
SLACK_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
ALERT_EVALUATOR_LOCK_ID: z.coerce.number().int().default(47821001),
```

**`.env.example` delta (sección nueva al final del archivo de Units 1+2)**:

```env
# === Handoff / Rollout / Alerts (Unit 3) ===
# SMTP (mailhog en dev, corporate SMTP en Fase 2 prod)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM=hermes@patprimo.local

# Slack incoming webhook (opcional; si vacío, alertas solo en BM UI)
SLACK_WEBHOOK_URL=

# AlertEvaluator advisory lock id (cambiar solo si conflicto)
ALERT_EVALUATOR_LOCK_ID=47821001
```

---

## 5. Migration sequence completa (Units 1 + 2 + 3)

El `npm run migrate` ejecuta en orden las 11 migraciones acumuladas:

| Migration | Origen | Propósito |
|---|---|---|
| `0001-init.sql` | U1 | conversations, turns, tool_call_records, guardrail_events, rate_limit_buckets, schema_migrations |
| `0002-consent-log.sql` | U1 | consent_log append-only |
| `0003-brand-config-seed.sql` | U1 | `brand_configs` tabla seed |
| `0004-turn-log-audit.sql` | U1 | turn_log_audit + pii_token_map |
| `0005-indexes.sql` | U1 | indexes |
| `0006-unit2-brand-config-redesign.sql` | U2 | DROP brand_configs + CREATE brand_config_versions + tablas auth + seed Patprimo |
| **`0007-unit3-system-config.sql`** | **U3** | system_config single-row con seed defaults (`hermes_enabled=true`, `traffic_percentage=0`, random salt) |
| **`0008-unit3-system-config-audit.sql`** | **U3** | system_config_audit append-only |
| **`0009-unit3-handoff-ticket.sql`** | **U3** | handoff_ticket + secuencia para ticket_short_id + 3 índices |
| **`0010-unit3-alerts.sql`** | **U3** | alert_rules + 5 builtin seed + alert_events + índices |
| **`0011-unit3-turn-log-audit-extend.sql`** | **U3** | ALTER turn_log_audit: 5 columnas nuevas nullable + 2 índices |

> Las 5 migraciones U3 son **forward-only / append-only** — sin DROP, sin RENAME. Cero riesgo de pérdida de data U1/U2.

---

## 6. mailhog service en docker-compose (Q1=A)

### 6.1 Adición al `docker-compose.yml`

```yaml
services:
  app:
    # ... (U1+U2 config sin cambios) ...
    environment:
      # ... heredados U1+U2
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_SECURE: ${SMTP_SECURE}
      SMTP_FROM: ${SMTP_FROM}
      SLACK_WEBHOOK_URL: ${SLACK_WEBHOOK_URL:-}
      ALERT_EVALUATOR_LOCK_ID: ${ALERT_EVALUATOR_LOCK_ID:-47821001}
    depends_on:
      postgres:
        condition: service_healthy
      mailhog:                                  # NUEVO U3
        condition: service_started

  postgres:
    # ... (U1 config sin cambios) ...

  mailhog:                                       # NUEVO U3 (dev-only)
    image: mailhog/mailhog:latest
    container_name: hermes-mailhog
    ports:
      - "127.0.0.1:1025:1025"                    # SMTP
      - "127.0.0.1:8025:8025"                    # Web UI
    restart: unless-stopped
    networks:
      - hermes-net
```

### 6.2 Acceso al web UI

Una vez levantado con `npm run up`, el equipo dev abre `http://localhost:8025` y ve los emails interceptados en tiempo real. Cada email muestra HTML + plain + headers.

### 6.3 Migración a Fase 2 prod (out-of-scope MVP)

Para producción, el servicio `mailhog` se elimina del compose y `SMTP_HOST/PORT/SECURE` apuntan a SMTP corporativo de PASH (probablemente Office 365 / Google Workspace SMTP relay). Cero cambios al código de la app.

---

## 7. AlertEvaluator job lifecycle

### 7.1 Registro al boot (composition root)

```ts
// hermes/src/composition.ts (extensión U3)
registerAlertEvaluatorJob({
  pg,
  alertEvaluator,
  logger,
  lockId: env.ALERT_EVALUATOR_LOCK_ID,
});
```

### 7.2 Comportamiento

- `node-cron` schedule `*/1 * * * *` (cada 60s) — registrado en el mismo proceso Fastify.
- Cada tick: `pg_try_advisory_lock(lockId)` → si false, skip (otro tick aún corriendo); si true, eval secuencial de reglas activas + unlock en `finally`.
- Si el job runtime throw, el cron se mantiene; siguiente tick reintenta.
- Si Postgres está down → `pg_try_advisory_lock` falla; logger.error; siguiente tick reintenta cuando PG vuelva.

### 7.3 Shutdown graceful (heredado U1)

Fastify SIGTERM handler dispara `app.close()` → drains in-flight requests + cancela cron schedules. `node-cron` tiene `cron.getTasks().forEach(t => t.stop())` invocado en `onClose` hook.

---

## 8. Backup strategy (Q3=A — extender script U2)

### 8.1 Script `npm run backup` extendido

**Lives in**: `hermes/scripts/backup.sh` (existente de U2)
**Cambio**: el `pg_dump` ya incluye TODAS las tablas — no requiere cambios al script. Pero el runbook documenta las tablas U3 como críticas también.

```bash
#!/bin/bash
LABEL="${1:-snapshot}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec -T postgres pg_dump -U postgres -d hermes \
  > "backups/hermes_${LABEL}_${TIMESTAMP}.sql"
echo "Backup created: backups/hermes_${LABEL}_${TIMESTAMP}.sql"
```

### 8.2 Tablas críticas a verificar después del restore

Tablas con valor legal/auditable que el equipo debe verificar manualmente:
- `sign_offs` (U2) — sign-offs del Brand Manager
- `auth_audit_log` (U2) — logins / lockouts
- `consent_log` (U1) — consent del cliente final
- **`handoff_ticket` (U3)** — historial de escalamientos
- **`system_config_audit` (U3)** — cambios de rollout / kill switch con razón
- **`alert_events` (U3)** — todos los disparos de alertas (notified + throttled)

Total: 6 tablas auditables.

### 8.3 Runbook Demo Day

```bash
# 1 día antes de Demo Day (2026-06-08)
npm run backup -- pre-demo-day-2026-06-09
# Output: backups/hermes_pre-demo-day-2026-06-09_20260608_HHMMSS.sql

# Verificar el archivo:
ls -lh backups/hermes_pre-demo-day-2026-06-09_*.sql

# Si demo se rompe mid-show: NO restorar mid-show (slow);
# usar kill switch (PATCH /admin/rollout/kill-switch {enabled: false})
# para mostrar offline message inmediatamente.

# Post-demo:
npm run backup -- post-demo-day-2026-06-09
```

---

## 9. Networking — sin cambios estructurales

Mismos port bindings (`127.0.0.1` only) heredados de U1/U2. Adiciones:
- `127.0.0.1:1025` (mailhog SMTP) y `127.0.0.1:8025` (mailhog web UI) — bind explícito a loopback para no exponer a la red local.

**Outbound nuevos**:
- App → mailhog (red interna `hermes-net`).
- App → Slack incoming webhook (`hooks.slack.com`, HTTPS). Sin proxy.

**CORS sin cambios**: las rutas `/admin/dashboard/*`, `/admin/escalations/*`, `/admin/alerts/*`, `/admin/rollout/*`, `/admin/handoff-tickets/*` heredan el CORS config de `/admin/*` de U2 (localhost en dev, dominio admin en Fase 2 prod).

---

## 10. Monitoring delta

### 10.1 Nuevos eventos pino (heredado U1 logger, stdout JSON)

Listados en NFR-D §9.2:
- `handoff_triggered`, `handoff_package_built`, `handoff_delivery_succeeded`, `handoff_delivery_failed`
- `rollout_admitted`, `rollout_excluded` (nivel `debug` — alto volumen), `rollout_skipped`
- `alert_dispatched`, `alert_throttled`

### 10.2 Dashboards introducidos

Unit 3 ES en sí mismo el sistema de observability del producto. El operador ve dashboards desde la BM UI:
- `/admin/dashboard` — 6 KPIs
- `/admin/escalations` — drill-down
- `/admin/alerts` — feed de alert_events
- `/admin/rollout` — vista del traffic % + audit log

### 10.3 Sin centralización externa en MVP

Sigue siendo `docker compose logs hermes` para inspeccionar log JSON. Fase 2 candidate: ELK / Loki / Datadog ingesting pino output.

---

## 11. Resource sizing — sin cambios significativos

Mismo budget que U1+U2: ~4 GiB RAM laptop dev. mailhog suma ~64 MiB. AlertEvaluator job consume <50 MB RSS pico.

---

## 12. Updates a npm scripts (delta U3)

Sin scripts nuevos. El `npm run up`, `npm run migrate`, `npm run backup`, `npm run create-bm`, etc. heredados de U1/U2 cubren U3 sin cambios.

Detalle:
- `npm run up` → `docker compose up -d --build` → ahora levanta 3 containers (app + postgres + mailhog).
- `npm run migrate` → ejecuta las 11 migraciones (5 nuevas U3 incluidas).
- `npm run backup` → `pg_dump` completo incluye tablas U3.

---

## 13. Out-of-scope (MVP)

- ❌ Staging / prod environments
- ❌ Backup automation (cron, S3 sync) — Q3=A
- ❌ SMTP corporativo (mailhog dev-only en MVP) — Q1=A
- ❌ Slack required + on-call rotation
- ❌ Worker container separado para AlertEvaluator — Q1 NFR-R = A
- ❌ Centralized logging (ELK/Loki/Datadog)
- ❌ Multi-instance horizontal scaling (cache `system_config` requiere pub/sub si así)
- ❌ Monitoring centralizado (Prometheus/Grafana)

---

## 14. Security Compliance Summary

| Rule | Status | Implementación |
|---|---|---|
| SECURITY-03 | Parcial | SMTP plain en mailhog dev; `SMTP_SECURE=true` obligatorio en Fase 2 prod (documentado en `.env.example` y runbook) |
| SECURITY-06 | Aplicado | Migrations 0007-0011 incluyen `GRANT SELECT, INSERT, UPDATE` per-tabla al rol `hermes_app`; sin grants a `hermes_retention` (no aplica retention MVP) |
| SECURITY-09 | Aplicado | mailhog bound a `127.0.0.1` only — no expuesto a red local |
| SECURITY-10 | Aplicado | mailhog image pinned via lockfile (Docker image tag); deps npm pinned en lockfile |
| SECURITY-13 | Aplicado | Migration 0008 garantiza `system_config_audit` append-only (sin UPDATE/DELETE grants) |
| SECURITY-14 | **Aplicado** | AlertEvaluator job registrado al boot; 5 reglas builtin seed activas desde primer run |
| Otros | Cubiertos en stages anteriores | — |

*No hay findings bloqueantes en este stage.*
