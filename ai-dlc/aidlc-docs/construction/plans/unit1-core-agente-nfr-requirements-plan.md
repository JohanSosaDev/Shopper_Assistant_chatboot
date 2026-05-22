# NFR Requirements Plan — Unit 1: Core Agente

## Plan Overview

**Unit**: Unit 1 — Core Agente
**Purpose**: Definir non-functional requirements de Unit 1 (performance, scalability, availability, security, reliability, maintainability) y cerrar las decisiones de tech stack restantes (migrations, tests).

**Input artifacts:**
- Functional Design Unit 1 (`construction/unit1-core-agente/functional-design/`)
- `requirements.md` §6 (NFRs ya definidos en Inception)
- `prd.md` §10 (KPIs y targets)

**Lo que YA está definido (no se vuelve a preguntar):**
- Latencia p50 <30s, p95 <60s (PRD §10)
- 50 conversaciones simultáneas target (`requirements.md` §6.3)
- Uptime MVP 99%
- Stack core: TS+Node+Fastify+Postgres+Bedrock+Zod+pg raw+pino
- Compliance: Ley 1581 + SIC 002/2024 + Bedrock LATAM + DPA Anthropic
- Security Baseline activa (15 reglas SECURITY-01..15)
- PBT extension activa

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Patrón de carga + capacidad de pico

Capacidad steady state objetivo: ~50 conversaciones simultáneas. ¿Qué pico esperamos?

A) **Pico = 2× steady state (100 conv simultáneas)** durante 1h al día (lunch + tarde). Diseñar para ese pico sin auto-scaling (MVP local-only). Si se excede → rate limit + degrade graceful (mensaje al cliente).
B) **Pico = 3× steady state (150 conv)** alineado con el case study Oct8ne (150k visitas/mes Patprimo concentradas en horario). Diseñar más holgado, justifica más cores.
C) **Steady state plano (50 conv)** sin pico distinguido — MVP demo-focused, no necesita absorber picos reales. Optimizar para correctness, no para capacity.
X) Otro

[Answer]: C

---

### Question 2 — SLO por endpoint

Tres endpoints públicos de Unit 1: `/chat`, `/ab/decide` (placeholder Unit 1, real Unit 3), `/health`. ¿Qué SLO de latencia + disponibilidad?

A) **`/chat` p50 <30s p95 <60s · 99% uptime · `/ab/decide` p99 <100ms · 99.5% uptime · `/health` p99 <50ms · siempre disponible**. Targets agresivos pero realistas para MVP demo.
B) **Solo `/chat` con SLO; los demás "best effort"** — simplifica trade-offs en MVP; foco en la experiencia de chat.
C) **SLO blando uniformes — p95 <60s, 99% uptime** para todos los endpoints. Más simple operacionalmente.
X) Otro

[Answer]: B

---

### Question 3 — Migrations tool (cierra OD-2)

¿Qué herramienta de migrations para Postgres?

A) **`node-pg-migrate`** — popular para `pg` raw driver, migrations en JS/SQL files, up/down commands, integra fácil con CI.
B) **`postgres-migrations`** — alternativa más simple; SQL files puros + tracker; menos features, menos puntos de quiebre.
C) **Plain SQL files + custom script** — máximo control; tracker propio en una tabla (`schema_versions`); más código a mantener.
X) Otro

[Answer]: B

---

### Question 4 — Tests stack + coverage target (cierra OD-6)

Para Unit 1 que incluye orquestador + tools + persistence + frontend widget:

A) **Vitest** (unit + integration backend) + **Supertest** (integration HTTP contra Fastify) + **Playwright** (e2e widget). Coverage target: **70% branches + 80% lines** en código de negocio (services/, lib/, tools/).
B) **Vitest + Supertest** sin e2e — el e2e del widget se valida manualmente en demo. Coverage **70% lines**.
C) **Jest + Supertest + Playwright** — Jest más maduro pero más lento que Vitest. Coverage 70/80.
X) Otro

[Answer]: B

---

### Question 5 — Log retention + rotation strategy

SECURITY-14 exige retención ≥90 días. Para MVP local-only Docker Compose:

A) **Postgres como sink único** (logs vivos en tabla `turn_log_audit`); retención 90 días enforced por `retention.job` que purga rows con `timestamp_iso < now() - 90d`. Backup diario de la tabla a snapshot file local.
B) **Postgres + archivo JSON apend-only en disco** (doble write) — redundancia simple para MVP; el archivo se rota mensualmente y se comprime; Postgres retiene 90d.
C) **Postgres + structured stdout (pino → JSON lines a stdout)** — Docker captura stdout; en MVP local los logs viven en docker logs hasta rotación; en Fase 2 → CloudWatch. Retención 90d en Postgres independiente del stdout.
X) Otro

[Answer]: C

---

> Cuando termines de responder, escribe **"listo"** y genero los 2 artefactos (`nfr-requirements.md` + `tech-stack-decisions.md`).

---

## Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1=C, Q2=B, Q3=B, Q4=B, Q5=C — sin ambigüedades
- [x] Generar `nfr-requirements.md` — 10 secciones (Perf, Scale, Avail, Security 15-rules, Reliability, Maintain, Usability, traceability, out-of-scope)
- [x] Generar `tech-stack-decisions.md` — confirma stack + cierra OD-2 (`postgres-migrations`) y OD-6 (Vitest + Supertest, sin Playwright); 10 decisiones tabuladas
- [x] Verificar consistencia con SECURITY-XX rules
- [x] Actualizar `aidlc-state.md`
- [ ] Presentar completion message (2-option)
