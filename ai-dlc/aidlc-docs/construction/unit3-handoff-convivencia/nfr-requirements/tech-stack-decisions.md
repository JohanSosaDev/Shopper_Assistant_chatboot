# Tech Stack Decisions — Unit 3: Handoff & Despliegue Gradual

> Adiciones al stack de Units 1 y 2 + decisiones específicas Unit 3 (SMTP, scheduler, Slack adapter, PBT properties).

---

## 1. Stack heredado (de Units 1 y 2 — sin cambio)

| Capa | Tecnología | Origen |
|---|---|---|
| Lenguaje | TypeScript strict | U1 ADR-1 |
| Runtime | Node.js 20 LTS | U1 |
| Web framework | Fastify monolithic + plugins | U1 ADR-1 |
| DI | `fastify.decorate` | U1 ADR-2 |
| DB | PostgreSQL 16 + pgvector | U1 ADR-3 |
| DB driver | `pg` raw | U1 ADR-3 |
| Migrations | `postgres-migrations` | U1 TD-1 (OD-2) |
| Validation | Zod + `fastify-type-provider-zod` | U1 ADR-5 |
| Logger | pino structured JSON | U1 |
| HTTP outbound | undici | U1 |
| Security headers | `@fastify/helmet` | U1 |
| Rate limit | `@fastify/rate-limit` + Postgres storage | U1 |
| CORS | `@fastify/cors` | U1 |
| Tests | Vitest + Supertest | U1 TD-2..TD-5 |
| PBT | fast-check | U1 |
| Container | Docker Compose | U1 |
| Password hashing | `bcrypt` saltRounds=12 | U2 TD-U2-1 |
| JWT | `jsonwebtoken` + `@fastify/jwt` | U2 TD-U2-3 |
| Templating BM UI | EJS + `@fastify/view` (tentativo) | U2 TD-U2-7 |
| Resilience patterns | `withRetry`, `withCircuitBreaker`, `withTimeout` lib U1 | U1 NFR Design |

---

## 2. Adiciones nuevas Unit 3

### 2.1 SMTP client (Q2=A — best-effort)

| Library | Versión target | Propósito |
|---|---|---|
| `nodemailer` | 6.x | SMTP send con multipart HTML+plain text, retry-friendly API |
| `mailhog/mailhog` (docker image) | latest | Solo dev/MVP local — captura emails para inspección en `localhost:8025` |

**Por qué `nodemailer` (no AWS SES SDK directo / no @sendgrid/mail)**:
- nodemailer es agnóstico al SMTP provider (mailhog ahora, SES/Mailgun Fase 2 sin cambio de código).
- API simple (`transporter.sendMail({...})`) compatible con `withRetry`/`withCircuitBreaker` libs U1.
- Soporta multipart HTML+plain (R-HOD-4) nativamente.
- Maduro (15+ años) y battle-tested.

**Configuración MVP local**:
```ts
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,        // 'mailhog' (service name en docker-compose)
  port: env.SMTP_PORT,         // 1025 (mailhog default)
  secure: false,               // sin TLS en mailhog dev
  // En Fase 2 prod: secure: true + auth: {user, pass} con TLS obligatorio
});
```

**Docker Compose adición**:
```yaml
services:
  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "127.0.0.1:1025:1025"   # SMTP port
      - "127.0.0.1:8025:8025"   # Web UI para inspección
    restart: unless-stopped
```

### 2.2 Scheduler (Q1=A — in-process timer)

| Library | Versión target | Propósito |
|---|---|---|
| `node-cron` | 3.x | Scheduling declarativo dentro del proceso Fastify; expresión cron `*/1 * * * *` |

**Por qué `node-cron` (no `setInterval` raw / no `agenda` / no `bull`)**:
- `node-cron` es declarativo (cron expressions); más legible que `setInterval(fn, 60_000)`.
- Sin DB dependency adicional (a diferencia de agenda/bull que requieren Mongo/Redis).
- Suficiente para MVP: 1 job (`AlertEvaluator.tick`) cada minuto.
- Migración a worker container (Fase 2) es trivial: el mismo código corre en otro entrypoint.

**Uso**:
```ts
import cron from 'node-cron';
cron.schedule('*/1 * * * *', async () => {
  const lock = await pg.query('SELECT pg_try_advisory_lock($1)', [ALERT_EVALUATOR_LOCK_ID]);
  if (!lock.rows[0].pg_try_advisory_lock) {
    logger.warn('AlertEvaluator: previous tick still running, skipping');
    return;
  }
  try {
    await alertEvaluator.tick();
  } finally {
    await pg.query('SELECT pg_advisory_unlock($1)', [ALERT_EVALUATOR_LOCK_ID]);
  }
});
```

### 2.3 Slack webhook adapter (Q3=C — retry+persist)

**Sin library externa**. Adapter custom thin wrapper sobre `undici` (ya en stack U1):

```ts
// src/lib/adapters/slack.ts
export async function postToSlackWebhook(text: string, blocks?: unknown[]) {
  const webhook = env.SLACK_WEBHOOK_URL;
  if (!webhook) return { ok: false, reason: 'no_webhook_configured' };

  return withRetry(
    async () => {
      const res = await undici.request(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, blocks }),
      });
      if (res.statusCode >= 200 && res.statusCode < 300) return { ok: true };
      throw new SlackWebhookError(`Slack returned ${res.statusCode}`);
    },
    { attempts: 3, baseDelayMs: 500, backoff: 'exponential' }
  );
}
```

**Por qué no `@slack/web-api`**:
- El use case es 1 incoming webhook (no Slack Web API completa).
- Web API requiere bot token + permisos OAuth — over-engineering para MVP.
- Incoming webhook URL es 1 env var, payload JSON simple. Custom adapter = ~30 LoC.

### 2.4 Sentiment scoring (Q1 plan FD = A heurística)

**Sin library externa**. Implementación custom:

```ts
// src/services/sentiment-scorer.ts
const lexicon: LexiconEntry[] = loadLexiconFromFile('prompts/sentiment_lexicon_es_co.json');

export function scoreSentiment(text: string): number {
  const normalized = normalizeText(text);  // NFD + lowercase + remove accents
  let score = 0;
  for (const entry of lexicon) {
    if (normalized.includes(entry.keyword)) {
      score += entry.weight * intensifierMultiplier(text, entry.keyword);
    }
  }
  return clamp(score, -1, 1);
}
```

**Por qué no `sentiment` npm package o `vader-sentiment`**:
- vader/sentiment trained mayoritariamente en inglés; ES coverage ~30% efectivo.
- Lexicón custom ES Col (~10-100 keywords) es trivial de mantener y más preciso para PASH.
- Cero dependency footprint.

### 2.5 Rollout gate

**Sin library externa**. Hash determinístico con `crypto.createHash('sha256')` (Node built-in):

```ts
// src/services/rollout-gate.ts
import { createHash } from 'node:crypto';

export function bucketFromIdentifier(identifier: string, salt: string): number {
  const h = createHash('sha256').update(identifier + salt).digest();
  return h.readUInt32BE(0) % 100;
}

export async function shouldServeHermes(identifier: string): Promise<boolean> {
  const config = await systemConfigRepo.get();  // cached 60s
  if (!config.hermes_enabled) return false;
  return bucketFromIdentifier(identifier, config.rollout_salt) < config.hermes_traffic_percentage;
}
```

---

## 3. Open Decisions status (Unit 3 cierra OD-7)

| OD | Tema | Status |
|---|---|---|
| OD-1 Fastify vs Express | ✅ Cerrada Inception |
| OD-2 Migrations | ✅ Cerrada U1 NFR-R |
| OD-3 Bedrock SDK | ✅ Cerrada Inception |
| OD-4 Validation | ✅ Cerrada Inception |
| OD-5 Frontend widget cliente | ✅ Cerrada U1 FD |
| OD-6 Tests stack | ✅ Cerrada U1 NFR-R |
| **OD-7 A/B Oct8ne** | **✅ Cerrada acá** — reformulada como "despliegue gradual sin Oct8ne" (kill switch + dark launch, TD-U3-5/6); blocker Oct8ne resuelto 2026-05-25 |
| OD-8 CI/CD pipeline | ⏸️ Pending Build and Test |
| OD-FE-BM (de U2) | ✅ Cerrada U2 — EJS server-rendered tentativo |

---

## 4. Migration strategy (sin DROP — solo ADD + CREATE; append-only forward)

Las migrations Unit 3 son **append-only / forward-only**, sin DROP a tablas U1/U2:

```sql
-- Migration 0007-unit3-system-config.sql
BEGIN;

CREATE TABLE system_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hermes_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  hermes_traffic_percentage INT NOT NULL DEFAULT 0
    CHECK (hermes_traffic_percentage BETWEEN 0 AND 100),
  rollout_salt BYTEA NOT NULL,
  handoff_stub_message TEXT NOT NULL,
  handoff_business_hours_cron TEXT NOT NULL DEFAULT '0 8-18 * * 1-6',
  slack_webhook_url TEXT,
  smtp_host TEXT NOT NULL DEFAULT 'mailhog',
  smtp_port INT NOT NULL DEFAULT 1025,
  smtp_from TEXT NOT NULL DEFAULT 'hermes@patprimo.local',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_config (
  id, rollout_salt, handoff_stub_message
) VALUES (
  1,
  gen_random_bytes(32),
  'Te conectamos con un asesor humano. Por favor déjanos tu correo electrónico o número de WhatsApp y te respondemos en horario hábil (8am–6pm, lunes a sábado, hora Bogotá).'
);

GRANT SELECT, UPDATE ON system_config TO hermes_app;
COMMIT;
```

```sql
-- Migration 0008-unit3-system-config-audit.sql
BEGIN;
CREATE TABLE system_config_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES brand_manager_users(user_id),
  field_name TEXT NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX system_config_audit_changed_at ON system_config_audit (changed_at DESC);
GRANT SELECT, INSERT ON system_config_audit TO hermes_app;
COMMIT;
```

```sql
-- Migration 0009-unit3-handoff-ticket.sql
BEGIN;
CREATE SEQUENCE handoff_ticket_short_seq;

CREATE TABLE handoff_ticket (
  ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_short_id TEXT UNIQUE NOT NULL,
  conversation_id UUID NOT NULL,
  brand TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN
    ('button_click','explicit_request','sentiment_negative','out_of_scope_intent','low_confidence')),
  priority TEXT NOT NULL CHECK (priority IN ('high','normal')),
  status TEXT NOT NULL CHECK (status IN
    ('pending','awaiting_contact','delivered','delivery_failed','delivery_failed_breaker','package_invalid')),
  contact_info TEXT,
  contact_kind TEXT CHECK (contact_kind IN ('email','phone','not_provided')),
  package_audit JSONB NOT NULL,
  degraded_fields JSONB NOT NULL DEFAULT '[]',
  email_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE INDEX handoff_ticket_conv ON handoff_ticket (conversation_id);
CREATE INDEX handoff_ticket_status_created ON handoff_ticket (status, created_at DESC);
CREATE INDEX handoff_ticket_cola
  ON handoff_ticket (brand, priority, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON handoff_ticket TO hermes_app;
GRANT USAGE ON SEQUENCE handoff_ticket_short_seq TO hermes_app;
COMMIT;
```

```sql
-- Migration 0010-unit3-alerts.sql
BEGIN;

CREATE TABLE alert_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  metric TEXT NOT NULL,
  window_minutes INT NOT NULL CHECK (window_minutes BETWEEN 1 AND 1440),
  operator TEXT NOT NULL CHECK (operator IN ('>','<','>=','<=','==')),
  threshold NUMERIC NOT NULL,
  cooldown_minutes INT NOT NULL DEFAULT 15 CHECK (cooldown_minutes BETWEEN 1 AND 720),
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID REFERENCES brand_manager_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed 5 reglas builtin (R-ALERT-2)
INSERT INTO alert_rules (name, is_builtin, metric, window_minutes, operator, threshold, severity) VALUES
  ('latency_p95_breach', TRUE, 'latency_p95', 10, '>', 90000, 'high'),
  ('guardrail_violation', TRUE, 'guardrail_violation_count', 1, '>', 0, 'critical'),
  ('circuit_breaker_open', TRUE, 'circuit_breaker_open_seconds', 2, '>', 120, 'critical'),
  ('package_incomplete', TRUE, 'package_incomplete_count', 5, '>', 0, 'high'),
  ('email_delivery_failure_rate', TRUE, 'email_delivery_failure_rate', 60, '>', 0.05, 'medium');

CREATE TABLE alert_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(rule_id),
  actual_value NUMERIC NOT NULL,
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  slack_status TEXT CHECK (slack_status IN ('ok','failed','no_webhook_configured')),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cooldown_until TIMESTAMPTZ
);

CREATE INDEX alert_events_rule_triggered ON alert_events (rule_id, triggered_at DESC);
CREATE INDEX alert_events_triggered ON alert_events (triggered_at DESC);

GRANT SELECT, INSERT, UPDATE ON alert_rules TO hermes_app;
GRANT SELECT, INSERT ON alert_events TO hermes_app;
COMMIT;
```

```sql
-- Migration 0011-unit3-turn-log-audit-extend.sql
BEGIN;
ALTER TABLE turn_log_audit
  ADD COLUMN handoff_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN handoff_trigger TEXT,
  ADD COLUMN sentiment_score NUMERIC(4,3),
  ADD COLUMN add_to_cart BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN guardrail_violated BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE turn_log_audit
  ADD CONSTRAINT turn_log_handoff_trigger_check
  CHECK (handoff_trigger IS NULL OR handoff_trigger IN
    ('button_click','explicit_request','sentiment_negative','out_of_scope_intent','low_confidence'));

CREATE INDEX turn_log_handoff_triggered_created
  ON turn_log_audit (handoff_triggered, created_at DESC);
CREATE INDEX turn_log_handoff_trigger_created
  ON turn_log_audit (handoff_trigger, created_at DESC)
  WHERE handoff_triggered = TRUE;
COMMIT;
```

**Riesgos**: cero — todas las columnas nuevas son nullable o tienen default. Sin DROP, sin RENAME, sin breaking change a U1/U2.

---

## 5. Decision log Unit 3 (tabular)

| # | Decisión | Valor | Razonamiento |
|---|---|---|---|
| TD-U3-1 | SMTP client | `nodemailer` 6.x + mailhog dev / corporate SMTP Fase 2 | Q2=A; agnóstico al provider |
| TD-U3-2 | Scheduler | `node-cron` 3.x in-process | Q1=A; MVP volume bajo; sin DB extra |
| TD-U3-3 | Worker container separado | **NO en MVP** (in-process); abrir en Fase 2 si scale | Q1=A; consistency con U1 single-container |
| TD-U3-4 | Slack adapter | Custom undici-based wrapper (~30 LoC) | Q3=C; un solo webhook; sin OAuth |
| TD-U3-5 | Despliegue gradual | Kill switch + dark launch combinados (cierra OD-7) | Q5 plan FD = C; PRD §13 línea 1504 requiere mecanismo de % |
| TD-U3-6 | Rollout gate hash | `sha256(identifier + salt) % 100` con `crypto` built-in | Determinismo + sal rotable |
| TD-U3-7 | Sentiment lib | **Custom heurística ES Col**, sin deps externas | Q1 plan FD = A; vader/sentiment ES coverage pobre |
| TD-U3-8 | Auto-retry SMTP job | **OUT of scope MVP** (Fase 2) | Q2=A best-effort; intervención manual via BM UI |
| TD-U3-9 | RBAC nuevos endpoints | `operator`+`admin` (R-DASH-6); `/admin/rollout/*` solo `admin` | Q4=A NFR-R; principle of least privilege |
| TD-U3-10 | PBT scope U3 | 3 funciones puras (SentimentScorer, RolloutGate, validatePackage) | Q5=A NFR-R; cubre lógica no trivial |
| TD-U3-11 | Migration strategy | Append-only forward (sin DROP) — 5 migraciones | Append-only es safer que U2 DROP+CREATE; tablas nuevas son aditivas |
| TD-U3-12 | Cleanup retention de alert_events | **OUT of scope MVP** (Fase 2 nightly job) | Volume bajo no justifica todavía |
| TD-U3-13 | SMTP TLS | Plain en dev (mailhog); TLS obligatorio en Fase 2 | SECURITY-03 parcial; aceptable en local-only MVP |

---

## 6. Dependencias npm a agregar (a `package.json`)

```json
{
  "dependencies": {
    "nodemailer": "^6.9.13",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.15"
  }
}
```

`node-cron` ya incluye sus tipos; `undici` y `pg` ya en stack U1.

---

## 7. Security Compliance Summary (stage = Tech Stack Decisions U3)

| Rule | Aplicación |
|---|---|
| SECURITY-03 | SMTP TLS en Fase 2 prod (mailhog plain ok en dev MVP local-only) |
| SECURITY-10 (supply chain) | `nodemailer` 6.x + `node-cron` 3.x pinneados en lockfile; `npm audit` en CI |
| SECURITY-11 (secure design) | Custom Slack adapter validado contra Slack webhook spec; sentiment scorer sin deps externas reduce supply chain surface |
| Otros | Cubiertos en `nfr-requirements.md` §10 |

*No hay findings bloqueantes en este stage.*
