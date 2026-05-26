# NFR Requirements Plan — Unit 3: Handoff & Despliegue Gradual

## Plan Overview

**Unit**: Unit 3 — Handoff & Despliegue Gradual + Operations Dashboards
**Purpose**: Definir NFRs específicos a Unit 3 (background scheduler model, SMTP failure handling, Slack webhook resiliency, RBAC para nuevos endpoints, PBT scope) + cerrar decisiones residuales de tech stack.

**Filosofía MVP**: Unit 3 hereda casi todo el stack de Units 1 y 2. Las preguntas se enfocan en lo NUEVO (alert evaluator cron, SMTP relay, Slack webhook, rollout gate runtime, dashboard read-path) y en RBAC/PBT delta.

**Input artifacts:**
- `aidlc-docs/construction/unit3-handoff-convivencia/functional-design/*` (3 archivos)
- `aidlc-docs/construction/unit1-core-agente/nfr-requirements/*` y `nfr-design/*` (heredar lo que aplique)
- `aidlc-docs/construction/unit2-knowledge-brand-voice/nfr-requirements/*` y `nfr-design/*` (heredar auth + admin SLOs)

**Lo que YA está definido (heredado de Units 1 y 2):**
- Stack: TS+Node+Fastify+Postgres+pgvector+Bedrock+Zod+pg raw+pino
- Migrations tool: `postgres-migrations` (TD-1)
- Test stack: Vitest + Supertest, 70% lines coverage (TD-2..TD-5)
- Deployment local Docker Compose, sin Redis, sin queue
- Logger pino → stdout
- Security Baseline activa (15 reglas), PBT activa
- Auth: bcrypt cost=12; password policy básica; JWT con @fastify/jwt; sesiones BM y operador (Unit 2)
- Admin SLOs: best-effort (Q3=A de Unit 2)
- Browser support: desktop modern only (Q4=A de Unit 2)

**Lo que YA fijó la FD de Unit 3 (no se re-pregunta):**
- Cache `system_config` 60s in-memory (R-ROLL-5)
- SMTP `withRetry(3, exponential)` + `withCircuitBreaker` (R-HOD-6)
- AlertEvaluator tick cada 60s (R-ALERT-5)
- Performance budget dashboard <500ms p95 query, <3s page load (R-DASH-3)
- SFCC timeout 3s en PackageBuilder (R-HO-11)

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Modelo de ejecución del AlertEvaluator (cron 60s)

`AlertEvaluator` corre cada 60s. ¿Cómo lo ejecutamos en MVP local Docker Compose?

A) **In-process timer** (`setInterval` o `node-cron`) dentro del mismo proceso Fastify. Cero infra extra. Riesgo: si el proceso web está bajo carga, el tick puede retrasarse; si el proceso muere, el cron también. Para MVP con 3-5 reglas y volumen bajo, aceptable.
B) **Worker container separado** — segundo servicio en `docker-compose.yml` corriendo `node dist/jobs/alert-evaluator.js`. Aislamiento de carga; el job no afecta latency del web. +1 día setup + 1 contenedor más.
C) **Postgres `pg_cron` extension** — scheduling DB-side, llama función SQL que evalúa reglas. Sin app process necesario. Requiere `pg_cron` instalado en la imagen Postgres del compose. Bajo control de DBA en prod.
X) Otro

**Recomendación tentativa**: **A (in-process timer)**. Razones: (1) MVP volumen bajo (<5 reglas, eval <100ms); (2) un solo container web hereda el patrón de Unit 1; (3) si el web está caído, las alertas no son la prioridad — el web caído es el evento crítico; (4) B y C migrables en Fase 2 si escala.

[Answer]: A — In-process timer con `node-cron` (más declarativo que `setInterval`; expresión cron `*/1 * * * *`). Postgres advisory lock previene corridas paralelas si un tick toma >60s. Fase 2: extraer a worker container si el volumen lo justifica.

---

### Question 2 — SMTP failure handling — SLO formal vs best-effort

Cuando `DeliveryAdapter` envía email a `cx@patprimo.com` y SMTP falla (timeout, breaker abierto), ¿qué nivel de garantía?

A) **Best-effort** — el `withRetry(3)` ya está en la FD; si falla, ticket queda en `status='delivery_failed'` o `'delivery_failed_breaker'`; alerta `email_delivery_failure_rate>5%` dispara según R-ALERT-2; el operador interviene manualmente desde el BM UI. **Sin SLO formal de delivery.**
B) **SLO formal** — `>95% delivered in <60s p95` con dashboard de Email SLO + auto-retry job diferido (cada 5 min reintenta tickets `delivery_failed`). +1.5 días.
C) **Sync block** — el cliente espera hasta confirmar delivery antes de ver mensaje de cierre. Si SMTP tarda, el cliente espera. Peor UX cuando SMTP se degrada; latency del handoff suma SMTP latency.
X) Otro

**Recomendación tentativa**: **A (best-effort + alerta)**. Razones: (1) MVP local usa mailhog que nunca falla; (2) en Fase 2 con SMTP corporativo, el monitoreo de la alerta `email_delivery_failure_rate>5%` cubre el caso; (3) auto-retry job (opción B) es Fase 2 candidate cuando haya volumen para justificar; (4) sync block (C) degrada UX innecesariamente.

[Answer]: A — Best-effort: `withRetry(3, exponential)` + `withCircuitBreaker` (ya en FD R-HOD-6); on failure final → ticket queda en `delivery_failed`/`delivery_failed_breaker`; alerta builtin `email_delivery_failure_rate>5%` dispara; operador interviene desde BM UI. Sin SLO formal de delivery en MVP.

---

### Question 3 — Slack webhook failure handling

Cuando el `AlertEvaluator` intenta postear al Slack webhook y falla (rate limit 429, 5xx, network timeout), ¿qué hacemos?

A) **Log + persist en `alert_events` con `slack_status='failed'`** — sin retry; el operador ve "alerta no notificada" en el BM UI feed y actúa manualmente.
B) **Retry inmediato 3 veces (withRetry exponential)** — sin breaker; cada tick del evaluador hace su propio retry corto.
C) **Combinación A + B** — `withRetry(3)` + si todos fallan, persist con `slack_status='failed'`. Consistente con SMTP (R-HOD-6).
X) Otro

**Recomendación tentativa**: **C (retry + persist)**. Razones: (1) consistencia con el patrón de SMTP en Unit 3 y de SFCC/Bedrock en Unit 1; (2) Slack rate limits son típicamente transitorios, el retry los resuelve; (3) si todos fallan, el operador tiene el evento en `alert_events` para ver manualmente. Cero infra extra (usa `withRetry` lib Unit 1).

[Answer]: C — `withRetry(3, exponential, baseDelay=500ms)` para el POST al webhook; si los 3 intentos fallan, persist `alert_events.slack_status='failed'` con `notified=false`; el operador ve "alerta no notificada" en el feed del BM UI. Sin breaker por ahora (Slack rate limits son cortos; breaker introduciría falsos positivos).

---

### Question 4 — RBAC para nuevos endpoints `/admin/*` de Unit 3

Unit 3 agrega rutas: `/admin/dashboard/*`, `/admin/escalations/*`, `/admin/alerts/*`, `/admin/rollout/*`, `/admin/handoff-tickets/*`. ¿Qué roles acceden?

A) **Solo `operator` y `admin`** — `brand_manager` (rol Unit 2) NO accede a dashboards/alerts/rollout/escalations. Consistente con R-DASH-6 ya escrito en business-rules.
B) **`brand_manager` también accede dashboards** — el BM ve métricas de SU marca; sigue sin acceso a rollout/alerts (esos son operator-only).
C) **Granular per-endpoint** — definir matrix completa por endpoint × rol (más complejo, más alineado con RBAC profesional Fase 2).
X) Otro

**Recomendación tentativa**: **A (operator + admin)**. Razones: (1) consistente con lo ya documentado en R-DASH-6; (2) MVP Patprimo single-brand → no hay separación de "métricas por marca" relevante todavía; (3) C es over-engineering para 3-5 usuarios totales; (4) Fase 2 (multi-brand) reabre como decisión natural.

[Answer]: A — Solo `operator` y `admin` acceden a `/admin/dashboard/*`, `/admin/escalations/*`, `/admin/alerts/*`, `/admin/rollout/*`, `/admin/handoff-tickets/*`. `brand_manager` (rol Unit 2) sigue restringido a su scope: `/admin/brand-config/*`. Middleware JWT valida el scope `role IN ('operator','admin')` antes de procesar.

---

### Question 5 — PBT scope para Unit 3 (Property-Based Testing)

PBT está habilitado como extension. ¿Qué funciones puras de Unit 3 entran a PBT?

A) **3 core** — `SentimentScorer.score` (idempotente, clampada [-1,1], monotónica con intensificadores); `RolloutGate.shouldServeHermes` (determinismo por identifier, monotónica con traffic_percentage, kill switch absoluto); `validatePackage` (rechazo iff falta campo obligatorio).
B) **Solo las 2 más críticas** — SentimentScorer + RolloutGate; saltear validatePackage (es lógicamente trivial: chequea presencia de N keys).
C) **Más amplio (5)** — las 3 de A + `bucketFromIdentifier(identifier, salt)` (función helper) + `categorizeFromTrigger(trigger)` (mapping table lookup).
X) Otro

**Recomendación tentativa**: **A (las 3 con propiedades ya enunciadas en business-rules §8)**. Razones: (1) las 3 cubren las funciones puras donde la lógica es no-trivial; (2) `bucketFromIdentifier` es un wrapper de sha256 — su correctitud está en la lib criptográfica; (3) `categorizeFromTrigger` es un lookup en JSON seed — exhaustive testing con example-based es trivialmente exhaustivo (5 triggers); (4) validatePackage merece PBT porque la propiedad "rechazo iff falta campo" es testeable elegantemente con `fc.record` partial sampling.

[Answer]: A — 3 funciones puras a PBT con fast-check (heredado de Unit 1 PBT setup): `SentimentScorer.score` (props: pure, range clampada `[-1,1]`, monotonía con intensificadores), `RolloutGate.shouldServeHermes` (props: determinismo por `identifier`, monotonía con `traffic_percentage`, kill switch absoluto), `validatePackage` (prop: rechazo iff falta cualquier campo obligatorio, vía `fc.record` con partial sampling).

---

> Cuando termines de responder, escribe **"listo"** y genero los 2 artefactos: `nfr-requirements.md` (8-10 secciones cubriendo perf, scale, avail, security delta, reliability, maintainability, NFR-to-Story mapping, out-of-scope, security compliance) + `tech-stack-decisions.md` (adiciones Unit 3 — adapter SMTP, adapter Slack, node-cron o setInterval, decision log TD-U3-N).

---

## Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1–Q5; resolver ambigüedades — 5/5 aplicadas (A/A/C/A/A)
- [x] Generar `nfr-requirements.md` — 10 secciones (Performance, Scalability, Availability, Security delta, Reliability, Maintainability, Observability, NFR-to-Story 8 stories, Out-of-scope, Security Compliance)
- [x] Generar `tech-stack-decisions.md` — TD-U3-1..13: nodemailer + mailhog, node-cron in-process, Slack adapter custom undici, sentiment custom heurística, rollout gate sha256, migrations 0007-0011 SQL completos, decision log, deps npm
- [x] Verificar consistencia con SECURITY — SECURITY-02/06/08/10/11/13/14 aplicados; sin findings bloqueantes
- [x] Security compliance summary — incluido en ambos artefactos
- [x] Actualizar `aidlc-state.md`
- [x] Presentar completion message (2-option)
