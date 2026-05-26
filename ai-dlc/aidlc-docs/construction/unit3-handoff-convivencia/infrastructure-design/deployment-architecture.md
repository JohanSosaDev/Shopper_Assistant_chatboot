# Deployment Architecture — Unit 3: Handoff & Despliegue Gradual

> **Extiende** Units 1+2 `deployment-architecture.md` con los pasos de U3 (mailhog, env vars SMTP/Slack, migrations 0007-0011, AlertEvaluator boot, Demo Day runbook). Sin cambios estructurales fundamentales.
> **Plan Q&A ID**: Q1=A mailhog en compose, Q2=A Slack optional, Q3=A backup extension, Q4=A Demo Day conservadora.

---

## 1. Deployment diagram — delta U3

```mermaid
flowchart LR
    Dev[Developer laptop]
    BM[Brand Manager + Operador]
    CX[Equipo CX]

    subgraph Host["Docker host (laptop dev)"]
        subgraph Network["docker network: hermes-net"]
            App["hermes container<br/>port 3000<br/>+ todas las rutas U1+U2+U3"]
            PG[("postgres + pgvector<br/>+ tablas U1+U2+U3 (11 migrations)")]
            MH["mailhog<br/>SMTP :1025<br/>Web UI :8025<br/>(dev-only)"]
            App <-->|tcp 5432| PG
            App -->|SMTP :1025| MH
        end
        Volume[(hermes_pg_data)]
        PG -.persists.-> Volume
    end

    Bedrock[(AWS Bedrock)]
    SFCC[(SFCC OCAPI/SCAPI)]
    Slack[(Slack incoming webhook<br/>opcional)]
    Client[Browser cliente final]

    Dev -->|docker compose + npm scripts| Host
    BM -->|HTTPS /admin/*| App
    Client -->|HTTP /chat + /widget/*| App
    App -->|HTTPS outbound| Bedrock
    App -->|HTTPS outbound| SFCC
    App -.->|HTTPS POST opcional| Slack
    MH -.->|inspecta emails| Dev
    CX -.->|en Fase 2: SMTP corporativo<br/>en lugar de mailhog| App

    style App fill:#4CAF50,color:#fff
    style PG fill:#9cf,color:#000
    style MH fill:#FFD54F,color:#000
    style Bedrock fill:#FFB300,color:#000
    style SFCC fill:#FFB300,color:#000
    style Slack fill:#FFB300,color:#000
```

---

## 2. Prerequisites (delta vs Unit 2)

Adicional a los prerequisites de Units 1+2:

7. **(Opcional) Slack incoming webhook**:
   - Si el equipo quiere recibir alertas en Slack durante MVP, crear un Incoming Webhook en `#hermes-alerts` (https://api.slack.com/messaging/webhooks).
   - Copiar la URL al `.env` como `SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...`.
   - Si se omite (Q2=A), las alertas se persisten en `alert_events` y son visibles desde el BM UI; cero error en boot.

8. **(Sin acción) SMTP**:
   - mailhog se levanta como parte de `docker compose up`; no requiere preparación.
   - En Fase 2 prod: obtener credenciales SMTP corporativo (Office 365 / Google Workspace / Mailgun / SES) y poblar `SMTP_HOST/PORT/SECURE` + secret manager para password.

---

## 3. Updated Quick start (Units 1 + 2 + 3 end-to-end)

### Step 1 — Clonar y configurar
```bash
git clone <repo> && cd Shopper_Assistant_chatboot/hermes
cp .env.example .env
# Editar .env con TODAS las credenciales:
#   - AWS (U1): BEDROCK_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
#   - SFCC OAuth (U1): SFCC_HOST, SFCC_CLIENT_ID, SFCC_CLIENT_SECRET
#   - PII_SALT (U1): openssl rand -hex 32
#   - PG_APP_PASSWORD, PG_RETENTION_PASSWORD, POSTGRES_ROOT_PASSWORD (U1)
#   - JWT_SECRET (U2): openssl rand -hex 32
#   - SMTP_HOST/PORT/SECURE/FROM (U3): defaults mailhog ok
#   - SLACK_WEBHOOK_URL (U3): opcional — dejar vacío si no se usa
```

### Step 2 — Levantar containers
```bash
npm install
npm run up      # docker compose up -d --build
```

Esperar 30–60s a que healthchecks pasen verde. Ahora son **3 containers**: `hermes`, `postgres`, `mailhog`.

Verificar mailhog:
```bash
open http://localhost:8025
# → MailHog web UI vacía (esperando emails)
```

### Step 3 — Migrations (11 total)
```bash
npm run migrate
# Output esperado (orden):
#   Applying 0001-init.sql ... OK
#   Applying 0002-consent-log.sql ... OK
#   Applying 0003-brand-config-seed.sql ... OK
#   Applying 0004-turn-log-audit.sql ... OK
#   Applying 0005-indexes.sql ... OK
#   Applying 0006-unit2-brand-config-redesign.sql ... OK
#   Applying 0007-unit3-system-config.sql ... OK            ← NUEVO U3
#   Applying 0008-unit3-system-config-audit.sql ... OK      ← NUEVO U3
#   Applying 0009-unit3-handoff-ticket.sql ... OK           ← NUEVO U3
#   Applying 0010-unit3-alerts.sql ... OK                   ← NUEVO U3 (incluye 5 reglas builtin seed)
#   Applying 0011-unit3-turn-log-audit-extend.sql ... OK    ← NUEVO U3
```

### Step 4 — Bootstrap del primer BM user (Unit 2)
```bash
npm run create-bm
# (flujo interactivo heredado de U2)
# Crear al menos 1 user con role=operator o role=admin para acceder a dashboards/rollout/alerts de U3
```

### Step 5 — Verificar — health + chat (U1)
```bash
curl http://localhost:3000/health/ready
# → {"status":"ok"}

curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test-1","brand":"patprimo","message":"hola"}'
# → respuesta con consent prompt
```

### Step 6 — Verificar — rollout config (NUEVO U3)
```bash
# Login (asume operator user creado en Step 4)
curl -X POST http://localhost:3000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"operator@pash.com.co","password":"<password>"}'
# → {"token":"eyJ..."}

# Ver config rollout actual:
TOKEN="eyJ..."
curl http://localhost:3000/admin/rollout/config \
  -H "Authorization: Bearer $TOKEN"
# → {"hermes_enabled":true, "hermes_traffic_percentage":0, ...}
```

### Step 7 — Verificar — handoff end-to-end (NUEVO U3)

Forzar trigger sentiment negativo:
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test-handoff-1","brand":"patprimo","message":"esto es PESIMO y horrible, quiero hablar con un humano YA"}'
# → respuesta stub: "Te conectamos con un asesor humano..."
```

Verificar email capturado en mailhog:
```bash
open http://localhost:8025
# → ver el email con asunto "[ALTA] Hermes Handoff HT-2026-XXXX..."
```

Verificar ticket en DB:
```bash
docker compose exec postgres psql -U postgres -d hermes \
  -c "SELECT ticket_short_id, trigger, priority, status FROM handoff_ticket ORDER BY created_at DESC LIMIT 5;"
```

### Step 8 — Verificar — dashboard + alertas (NUEVO U3)

```bash
# Abrir dashboard:
open http://localhost:3000/admin/dashboard
# → KPIs renderizados (probablemente 0/0 si sin tráfico real)

# Ver alert rules builtin:
curl http://localhost:3000/admin/alerts/rules -H "Authorization: Bearer $TOKEN"
# → 5 reglas builtin (latency_p95_breach, guardrail_violation, circuit_breaker_open, package_incomplete, email_delivery_failure_rate)
```

### Step 9 — (Opcional) Configurar Slack webhook
```bash
# En .env:
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
# Restart:
npm run restart
# Próximo disparo de alerta → Slack receive
```

---

## 4. Environment variables matrix (consolidado U1+U2+U3)

| Variable | Required | Default | Unit | Notas |
|---|---|---|---|---|
| **U1 — AWS + SFCC** |  |  |  |  |
| `BEDROCK_REGION` | sí | `sa-east-1` | U1 | LATAM region |
| `BEDROCK_MODEL_ID` | sí | (Haiku 4.5 id) | U1 | |
| `AWS_ACCESS_KEY_ID` | sí | — | U1 | |
| `AWS_SECRET_ACCESS_KEY` | sí | — | U1 | |
| `SFCC_HOST` | sí | — | U1 | |
| `SFCC_CLIENT_ID` | sí | — | U1 | |
| `SFCC_CLIENT_SECRET` | sí | — | U1 | |
| `SFCC_OAUTH_TOKEN_URL` | sí | — | U1 | |
| **U1 — Postgres + security** |  |  |  |  |
| `DATABASE_URL` | sí | — | U1 | full connection string para `hermes_app` |
| `POSTGRES_ROOT_PASSWORD` | sí | — | U1 | usado solo para boot del container |
| `PG_APP_PASSWORD` | sí | — | U1 | password del rol `hermes_app` |
| `PG_RETENTION_PASSWORD` | sí | — | U1 | password del rol `hermes_retention` |
| `PII_SALT` | sí | — | U1 | ≥32 chars random |
| `PORT` | no | `3000` | U1 | |
| `NODE_ENV` | no | `development` | U1 | |
| `LOG_LEVEL` | no | `info` | U1 | pino level |
| **U2 — Auth + admin** |  |  |  |  |
| `JWT_SECRET` | sí | — | U2 | ≥32 chars random |
| `JWT_EXP_SECONDS` | no | `28800` (8h) | U2 | |
| `BCRYPT_ROUNDS` | no | `12` | U2 | usar 4 en CI |
| `ADMIN_UI_ENABLED` | no | `true` | U2 | |
| **U3 — Handoff + alerts + rollout** |  |  |  |  |
| `SMTP_HOST` | sí | `mailhog` | **U3** | service name dev |
| `SMTP_PORT` | sí | `1025` | **U3** | mailhog port |
| `SMTP_SECURE` | no | `false` | **U3** | `true` en Fase 2 prod |
| `SMTP_FROM` | sí | `hermes@patprimo.local` | **U3** | |
| `SLACK_WEBHOOK_URL` | **no** | (vacío) | **U3** | optional — Q2=A |
| `ALERT_EVALUATOR_LOCK_ID` | no | `47821001` | **U3** | advisory lock id |

**Total**: 28 variables (16 U1 + 4 U2 + 8 U3). 19 obligatorias + 9 con default.

---

## 5. `.env.example` consolidado completo

```env
# ====== U1 — AWS Bedrock ======
BEDROCK_REGION=sa-east-1
BEDROCK_MODEL_ID=anthropic.claude-haiku-4-5-20250118-v1:0
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# ====== U1 — SFCC ======
SFCC_HOST=
SFCC_CLIENT_ID=
SFCC_CLIENT_SECRET=
SFCC_OAUTH_TOKEN_URL=

# ====== U1 — Postgres ======
DATABASE_URL=postgresql://hermes_app:CHANGE_ME@postgres:5432/hermes
POSTGRES_ROOT_PASSWORD=CHANGE_ME
PG_APP_PASSWORD=CHANGE_ME
PG_RETENTION_PASSWORD=CHANGE_ME

# ====== U1 — Security ======
PII_SALT=                        # generar con: openssl rand -hex 32

# ====== U1 — App config ======
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# ====== U2 — Admin / BM UI ======
JWT_SECRET=                      # generar con: openssl rand -hex 32
JWT_EXP_SECONDS=28800            # 8h
BCRYPT_ROUNDS=12
ADMIN_UI_ENABLED=true

# ====== U3 — SMTP (handoff email) ======
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM=hermes@patprimo.local

# ====== U3 — Slack alerts (opcional) ======
SLACK_WEBHOOK_URL=

# ====== U3 — Job config ======
ALERT_EVALUATOR_LOCK_ID=47821001
```

---

## 6. Demo Day runbook (Q4=A — secuencia conservadora)

### 6.1 Cronograma

| Fecha | Acción | Comando / verificación |
|---|---|---|
| **2026-06-06 (Día -3)** | Validación interna sin tráfico cliente | Configurar `traffic_percentage=0`; validar internamente con cuentas de prueba (forzando `?force_hermes=1` query param Fase 2 — en MVP es solo testing local con seed) |
| **2026-06-08 (Día -1)** | Backup + canary 5% | `npm run backup -- pre-demo-day-2026-06-09`; `PATCH /admin/rollout/traffic-percentage {percentage: 5, reason: "canary día -1"}`; equipo PASH valida con accounts reales en horario controlado |
| **2026-06-09 (Día 0 Demo Day)** | Demo a 25% | `PATCH /admin/rollout/traffic-percentage {percentage: 25, reason: "demo CTO"}` 1h antes de demo; si demo va limpia → `100` al cierre; si incident → kill switch off |
| **2026-06-10..16 (Día +1..+7)** | Ramp gradual | Según KPIs (latency p95 <90s, escalation rate <30%, 0 guardrail violations 24h): subir a 50, 75, 100 día a día |

### 6.2 Comandos exactos del runbook

```bash
# Día -1: backup + canary
npm run backup -- pre-demo-day-2026-06-09

curl -X PATCH http://localhost:3000/admin/rollout/traffic-percentage \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 5, "reason": "canary día -1 demo"}'

# Día 0: subir a 25%
curl -X PATCH http://localhost:3000/admin/rollout/traffic-percentage \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 25, "reason": "Demo Day CTO 2026-06-09"}'

# Día 0 — opción A (demo limpia): subir a 100
curl -X PATCH http://localhost:3000/admin/rollout/traffic-percentage \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 100, "reason": "Demo Day exitoso, ramp completo"}'

# Día 0 — opción B (incident): kill switch off
curl -X PATCH http://localhost:3000/admin/rollout/kill-switch \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false, "reason": "incident en demo — investigar"}'
```

### 6.3 Criterios go/no-go por gate

| Gate | Criterio | Si no se cumple |
|---|---|---|
| Día -3 → Día -1 (subir a 5%) | Health checks verdes 48h + tests pasan + Slack/mailhog responden | Investigar; demorar 24h |
| Día -1 → Día 0 (subir a 25%) | 5% por 24h sin incident crítico + latency p95 <90s + 0 guardrail violations | Mantener en 5% durante demo |
| Día 0 → Día +1 (subir a 100%) | Demo sin issues + 25% por 4h estable | Mantener en 25%; comunicar a stakeholders |
| Día +1..+7 (50/75/100%) | KPIs dentro de target + sin alertas críticas no resueltas | Pausar ramp; investigar |

---

## 7. Rollback procedures (delta U3)

### 7.1 Kill switch (rollback inmediato — <60s)

```bash
curl -X PATCH http://localhost:3000/admin/rollout/kill-switch \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false, "reason": "<motivo>"}'
```

Efecto: en ≤60s (cache TTL), todos los hits al widget reciben mensaje offline. Sin downtime de la app. Sin restart.

### 7.2 Reducir traffic % (rollback gradual)

```bash
# Bajar de 100% a 5%:
curl -X PATCH http://localhost:3000/admin/rollout/traffic-percentage \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 5, "reason": "<motivo>"}'
```

### 7.3 Rollback de migration (extremo)

Si una migration U3 introduce bug crítico (raro, son forward-only):
```bash
# Restore desde último backup:
docker compose down -v
docker compose up -d postgres
sleep 5
docker compose exec -T postgres psql -U postgres -d hermes \
  < backups/hermes_pre-demo-day-2026-06-09_<timestamp>.sql
docker compose up -d
```

Esto pierde data desde el backup. Operación destructiva — solo si es crítico.

### 7.4 Rollback de código a versión anterior

Si el deploy de U3 tiene bug crítico:
```bash
git checkout <previous-commit>
npm install
npm run up
# DB sigue con migrations 0007-0011 aplicadas; el código viejo simplemente no las usa
```

Migrations son additive — el código viejo (U1+U2) sigue funcionando con las tablas U3 presentes pero ignoradas.

---

## 8. Troubleshooting

### 8.1 Email no se entrega (mailhog)

**Síntomas**: `handoff_ticket.status = 'delivery_failed'`; mailhog web UI vacío.

```bash
# Verificar mailhog está arriba:
docker compose ps mailhog
# → Up

# Probar SMTP manualmente:
docker compose exec hermes sh -c \
  'echo "EHLO test" | nc mailhog 1025'

# Ver logs hermes:
docker compose logs hermes | grep -i smtp
```

### 8.2 Alertas no llegan a Slack

**Síntomas**: `alert_events.slack_status = 'failed'` o `'no_webhook_configured'`.

```bash
# Verificar env var:
docker compose exec hermes printenv SLACK_WEBHOOK_URL

# Probar webhook manualmente:
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"test desde dev local"}'
```

Si webhook responde 404 → webhook revoked en Slack; recrear y actualizar `.env` + restart.

### 8.3 AlertEvaluator no corre (no aparecen `alert_events`)

```bash
# Verificar logs:
docker compose logs hermes | grep -i alert
# Buscar: "AlertEvaluator: previous tick still running" (puede indicar advisory lock atascado)

# Liberar advisory lock manualmente (último recurso):
docker compose exec postgres psql -U postgres -d hermes \
  -c "SELECT pg_advisory_unlock_all();"
# Restart hermes para volver a tomar el lock limpio:
npm run restart
```

### 8.4 Rollout cache no se actualiza tras cambio

**Síntomas**: cambié `traffic_percentage` desde BM UI y los hits siguen viendo el % viejo después de 60s.

```bash
# Forzar invalidación manual via restart:
npm run restart
# → cache se reconstruye en cold start
```

Si el problema persiste → bug en `SystemConfigRepo.update()` — verificar que se llama `this.cache.invalidate('config')` post-UPDATE.

### 8.5 Handoff dispara duplicado (mismo conversation)

**Síntomas**: 2 tickets con mismo `conversation_id` y `trigger` similar en pocos segundos.

```sql
-- Verificar:
SELECT ticket_short_id, conversation_id, trigger, created_at
FROM handoff_ticket
WHERE conversation_id = '<id>'
ORDER BY created_at;
```

Si hay duplicado → bug en R-HO-7 (idempotencia); abrir issue. Workaround: marcar uno como `closed_at` manualmente.

---

## 9. Out-of-scope (MVP)

Heredados de U1+U2 + adiciones U3:
- ❌ Staging / prod environments
- ❌ Backup automation (cron, S3 sync)
- ❌ SMTP corporativo en MVP (Fase 2)
- ❌ Slack required + on-call rotation
- ❌ Monitoring centralizado (Prometheus/Grafana/Datadog)
- ❌ Multi-instance horizontal scaling
- ❌ CDN para BM UI assets
- ❌ Secrets manager runtime (Fase 2)
- ❌ Disaster recovery automation
- ❌ Auto-retry job para `delivery_failed` tickets

---

## 10. Demo Day operational notes

### 10.1 Lo que el CTO verá en la demo (orden sugerido)

1. **Conversación cliente normal (sin handoff)** — mostrar `/chat` happy path: consulta de estado de pedido + disponibilidad de stock.
2. **Trigger handoff por sentimiento** — el demo manda mensaje "este servicio es PESIMO, exijo devolución YA" → cliente ve stub message + email aparece en mailhog (compartir pantalla del MailHog UI a `localhost:8025`).
3. **Dashboard operador** — abrir `/admin/dashboard`; mostrar los 6 KPIs + drill-down de la conversación del paso 2.
4. **Alertas** — abrir `/admin/alerts`; mostrar las 5 reglas builtin + feed de eventos.
5. **Rollout control** — abrir `/admin/rollout`; mostrar kill switch + traffic % slider; explicar Demo Day plan.
6. **Audit trail** — mostrar `system_config_audit` con los cambios del runbook Demo Day documentados con razón.

### 10.2 Backup pre-demo (mandatory)

```bash
# Día anterior, en horario laboral:
npm run backup -- pre-demo-day-2026-06-09
ls -lh backups/hermes_pre-demo-day-2026-06-09_*.sql
```

### 10.3 Si algo falla mid-show

| Síntoma | Respuesta |
|---|---|
| Chat no responde | Kill switch off + mostrar offline message como Plan B legítimo del runbook |
| Email no llega a mailhog | Mostrar el ticket en BM UI handoff-tickets + decir "delivery async via SMTP" |
| Slack alert no llega | "Slack es opcional; las alertas se persisten en `alert_events`" + mostrar el feed en BM UI |
| Dashboard slow | Bajar ventana de query a 1h en lugar de 24h |

---

*Estado de Unit 3 ID: COMPLETO. Sin findings bloqueantes. Cubre todas las preguntas Q1-Q4 con detalle operativo + runbook Demo Day + troubleshooting.*
