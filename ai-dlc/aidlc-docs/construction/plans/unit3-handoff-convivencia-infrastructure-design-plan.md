# Infrastructure Design Plan — Unit 3: Handoff & Despliegue Gradual

## Plan Overview

**Unit**: Unit 3
**Purpose**: Documentar el delta de infraestructura introducido por Unit 3 — 1 contenedor nuevo (mailhog dev-only), env vars nuevas (SMTP, Slack, rollout salt), migration sequence 0007-0011, AlertEvaluator job lifecycle, runbook Demo Day para rollout gradual + kill switch + handoff offline.

**Filosofía MVP**: hereda Units 1+2 (Docker Compose local-only, Q1=A in-process timer, sin nueva infra). Solo agrega lo necesario para handoff + alerts + rollout.

**Input artifacts:**
- `construction/unit3-handoff-convivencia/nfr-design/nfr-design-patterns.md`
- `construction/unit3-handoff-convivencia/nfr-design/logical-components.md`
- `construction/unit3-handoff-convivencia/nfr-requirements/tech-stack-decisions.md` (migrations 0007-0011 SQL completo + deps npm)
- `construction/unit1-core-agente/infrastructure-design/*` y `construction/unit2-knowledge-brand-voice/infrastructure-design/*` (deployment-architecture a extender)

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Mailhog en `docker-compose.yml`: alcance

`mailhog` es necesario en dev para capturar emails sin enviar. ¿Cómo lo integramos?

A) **Servicio siempre presente en `docker-compose.yml`** — el compose lleva mailhog incluido; el equipo arranca todo con `docker compose up` y el flujo handoff funciona end-to-end. En Fase 2 prod, mailhog se quita del compose y `SMTP_HOST` apunta a SMTP corporativo. Más simple.
B) **Compose profile `dev`** — `docker compose --profile dev up` incluye mailhog; `docker compose up` (sin profile) lo omite. Más explícito sobre dev vs prod intent.
C) **Compose separado `docker-compose.dev.yml`** — archivo aparte que se carga con `-f docker-compose.yml -f docker-compose.dev.yml`. Patrón estándar pero más verboso.
X) Otro

**Recomendación tentativa**: **A**. Razones: (1) MVP es local-only por decisión Q7 Inception; (2) profiles y multi-file añaden cognitive load sin valor MVP; (3) cuando Fase 2 prod necesite SMTP corporativo, la migración del compose es trivial; (4) "arranca todo y funciona" es el principio del quickstart heredado de Unit 1.

[Answer]: A — `mailhog` siempre presente en `docker-compose.yml`. Quickstart heredado de U1 sigue siendo `docker compose up`. Fase 2 prod: remover el servicio + apuntar `SMTP_HOST` a SMTP corporativo + `SMTP_SECURE=true` + credenciales en secret manager.

---

### Question 2 — Slack webhook URL: required vs optional

`SLACK_WEBHOOK_URL` env var. ¿Qué hace el sistema si no está configurada?

A) **Optional con graceful degradation** — `SLACK_WEBHOOK_URL=` vacío es válido; el SlackAdapter retorna `{ ok: false, status: 'no_webhook_configured' }`; las alertas se persisten en `alert_events` y se loguean a stdout pero no notifican. Compatible con dev sin Slack setup; Demo Day demo el feature sin requerir webhook real.
B) **Required al boot** — si `SLACK_WEBHOOK_URL` no está → Zod env validation falla → app no startea. Forza la configuración explícita.
C) **Required SOLO en prod (`NODE_ENV=production`)** — dev permite vacío; prod exige. Más complejo.
X) Otro

**Recomendación tentativa**: **A**. Razones: (1) consistente con código del SlackAdapter ya en NFR-D §2.1 (`if (!webhook) return {no_webhook_configured}`); (2) Demo Day puede correr sin Slack real (las alertas visibles en `alert_events` BM UI bastan para demo); (3) Fase 2 productiva: agregar `SLACK_WEBHOOK_URL` al `.env` corporativo; (4) developer setup queda fricción-free.

[Answer]: A — `SLACK_WEBHOOK_URL` optional (default vacío en `.env.example`). Zod env schema marca como `.optional()`. SlackAdapter retorna `{ok: false, status: 'no_webhook_configured'}` cuando empty; AlertEvaluator persiste en `alert_events` con `slack_status='no_webhook_configured'`. BM UI muestra todas las alertas igualmente.

---

### Question 3 — Backup de tablas críticas Unit 3

`handoff_ticket`, `system_config_audit`, `alert_events` tienen valor operativo y auditable. Decisión Q3 de Unit 2 fue "backup manual on-demand pre-Demo Day para sign_offs+auth_audit_log+consent_log". ¿Cómo extender?

A) **Mismo runbook que U2 — extender el script `npm run backup` para incluir las 3 tablas nuevas U3** — backup on-demand antes de demos importantes (Demo Day 2026-06-09). Sin automatización.
B) **Backup automático daily SOLO de las tablas críticas U2+U3** — script cron diario que extrae las 6 tablas auditables (`sign_offs`, `auth_audit_log`, `consent_log`, `handoff_ticket`, `system_config_audit`, `alert_events`). +1 día setup.
C) **Backup completo del volume Docker postgres** — `docker run --rm -v hermes_pgdata:/data alpine tar czf /backup/...`; cubre TODO. Más simple pero todos los volúmenes (no granular).
X) Otro

**Recomendación tentativa**: **A**. Razones: (1) consistencia con Q3 Unit 2 — mismo runbook + comando + cadencia; (2) MVP local-only sin tráfico real → low risk de pérdida significativa; (3) Demo Day backup pre-evento es la única ventana donde realmente importa; (4) automatización daily (B) puede quedar Fase 2 si compliance lo exige.

[Answer]: A — Extender `npm run backup` (existente de U2) con 3 tablas U3 críticas: `handoff_ticket`, `system_config_audit`, `alert_events`. Total backup ahora cubre 6 tablas auditables (3 U2 + 3 U3). Runbook Demo Day: ejecutar `npm run backup -- --label "pre-demo-day-2026-06-09"` el día anterior. Automatización daily queda Fase 2.

---

### Question 4 — Demo Day rollout plan: secuencia operativa

Demo Day es 2026-06-09. Hermes va a soft launch con kill switch + dark launch (TD-U3-5/6). ¿Cuál es la secuencia recomendada en el runbook?

A) **Conservadora**: Día -3 → kill_switch=on, traffic=0% (validación interna sin tráfico real). Día -1 → traffic=5% (canary, equipo PASH valida con cuentas reales en horario controlado). Día 0 Demo Day → traffic=25% durante demo; subir a 100% solo si demo sin incidente; sino → kill_switch=off + handoff offline. Día +1..+7 → ramp gradual según KPIs.
B) **Agresiva**: Demo Day directo a traffic=100%; kill switch armado como red de seguridad. Mayor riesgo de incident en vivo pero más impresionante el demo.
C) **Sin ramp explícito en MVP** — Demo Day arranca con traffic=10%; ramp post-Demo según métricas observadas. Decisión del operador en runtime.
X) Otro

**Recomendación tentativa**: **A (conservadora)**. Razones: (1) PRD §13 línea 1504 ya promete "soft launch al 5% sin incidente crítico 48h" como gate — A se alinea; (2) demos profesionales con Director/CTO usan canary, no big-bang; (3) si algo falla en demo, kill switch + handoff offline son red de seguridad demostrable también; (4) C es esencialmente "lo decidimos sobre la marcha" — frágil para Demo Day.

[Answer]: A — Secuencia conservadora documentada en runbook: (1) **Día -3 (2026-06-06)**: `hermes_enabled=true`, `hermes_traffic_percentage=0` — validación interna sin tráfico cliente. (2) **Día -1 (2026-06-08)**: `traffic_percentage=5` — canary con cuentas del equipo PASH en horario controlado; validar dashboards + alertas + handoff offline. (3) **Día 0 Demo Day (2026-06-09)**: `traffic_percentage=25` para la demo; si demo limpia → subir a 100% al cierre; si incident → kill switch off + mensaje offline. (4) **Días +1..+7**: ramp gradual 25→50→100 según KPIs (latency p95, escalation rate, guardrail violations).

---

> Cuando termines de responder, escribe **"listo"** y genero los 2 artefactos (`infrastructure-design.md` + `deployment-architecture.md`) — el segundo extiende el quick-start de Units 1+2 con los pasos de Unit 3.

---

## Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1–Q4; resolver ambigüedades — 4/4 aplicadas (A/A/A/A)
- [x] Generar `infrastructure-design.md` — 14 secciones: deployment target, compute (3 containers con mailhog), storage 5 tablas + 1 extensión, env vars delta + Zod schema, migration sequence consolidada 0001-0011, mailhog en compose, AlertEvaluator job lifecycle, backup extension + tablas críticas, networking, monitoring delta (nuevos pino events + dashboards U3), resource sizing, npm scripts (sin nuevos), out-of-scope, Security Compliance
- [x] Generar `deployment-architecture.md` — 10 secciones: deployment diagram mermaid (mailhog + Slack), prerequisites delta (Slack opcional + SMTP mailhog), Quickstart 9-step end-to-end U1+U2+U3 con comandos curl exactos, env vars matrix consolidada (28 variables), `.env.example` consolidado completo, **Demo Day runbook con cronograma día -3 a día +7 + comandos curl + go/no-go gates**, rollback procedures (kill switch + traffic % + migration + código), troubleshooting (5 escenarios: email, Slack, AlertEvaluator stuck, cache stale, handoff duplicado), out-of-scope, Demo Day operational notes con orden de demostración
- [x] Verificar consistencia con NFR-D + tech-stack-decisions + FD
- [x] Security compliance summary
- [x] Actualizar `aidlc-state.md`
- [x] Presentar completion message (2-option)
