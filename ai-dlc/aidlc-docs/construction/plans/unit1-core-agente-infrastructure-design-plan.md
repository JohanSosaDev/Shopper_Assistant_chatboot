# Infrastructure Design Plan — Unit 1: Core Agente

## Plan Overview

**Unit**: Unit 1 — Core Agente
**Purpose**: Mapear los componentes lógicos a infraestructura concreta + decisiones de deployment.

**Filosofía MVP**: semana 2/4 + estación 5/12. La mayoría de decisiones ya están hechas en NFR Design (`logical-components.md` §7 ya tiene esqueleto Docker Compose). Esta stage cierra detalles y produce los artefactos de infraestructura listos para Code Generation.

**Input artifacts:**
- `construction/unit1-core-agente/nfr-design/logical-components.md` (topology + Docker Compose esqueleto)
- `construction/unit1-core-agente/nfr-design/nfr-design-patterns.md` (resilience + observability)
- `construction/unit1-core-agente/nfr-requirements/tech-stack-decisions.md` (TD-1..TD-10)

**Lo que YA está definido:**
- 2 servicios Docker Compose (app + postgres)
- Sin Redis, sin queue
- Backup vía `pg_dump`
- Logger pino → stdout
- Healthchecks definidos

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Región exacta de AWS Bedrock LATAM

El PRD fija "Bedrock LATAM" pero no especifica región. ¿Cuál usamos?

A) **`sa-east-1` (São Paulo)** — región LATAM con soporte Claude. Latencia razonable desde Colombia (~80–120ms). Compliance: data residency dentro de LATAM (Brasil — aceptable según interpretación amplia Ley 1581).
B) **`us-east-1` (N. Virginia)** — fallback si Claude no está disponible en sa-east-1 en el momento del MVP. Latencia mayor (~180-220ms desde Col); compliance: requiere documentar transferencia internacional explícita en consent.
C) **TBD — confirmar con AWS account de PASH** disponibilidad real de Claude Haiku 4.5 en LATAM. Documentar región como variable de env configurable; default `sa-east-1`.
X) Otro

[Answer]: C

---

### Question 2 — Environments matrix (dev / staging / prod)

¿Qué environments documentamos en infrastructure-design?

A) **Solo MVP local** (un único env "dev" en Docker Compose). Staging/prod quedan documentados como "Fase 2 — sin spec ahora".
B) **MVP local + stub de staging** — documentar el environment de staging (var names, secrets path, deploy target) aún sin desplegar. Útil para el Demo Day si necesitamos un environment fuera del laptop.
C) **MVP local + staging + prod placeholders** — los 3 documentados conceptualmente; solo dev implementado.
X) Otro

[Answer]: A

---

### Question 3 — Provisioning + automation approach

¿Cómo orquestamos comandos comunes (up, down, migrate, seed, logs)?

A) **`docker compose` directo, sin abstracción** — comandos a mano (`docker compose up`, `docker compose exec hermes npm run migrate`). Mínima fricción, más verboso.
B) **Makefile** con targets (`make up`, `make migrate`, `make logs`, `make seed`). Estándar en infra. **Problema**: `make` no es nativo en Windows; usuarios PASH probablemente Windows.
C) **npm scripts** (`npm run up`, `npm run migrate`, `npm run seed`, `npm run logs`). Funciona en Windows + macOS + Linux sin tooling extra. Cero fricción dev.
X) Otro

[Answer]: C

---

### Question 4 — Backup strategy MVP

`logical-components.md` propuso `pg_dump` cron en el host. ¿Confirmamos o ajustamos?

A) **`pg_dump` cron en host** corriendo daily, dump a archivo local rotado (mantener 7 días). Script en `hermes/scripts/backup.sh`.
B) **Backup manual on-demand** (`npm run backup`) — el dev lo ejecuta antes de demos importantes. Cero automation.
C) **Sin backup MVP** — los datos del MVP son demo seed + tráfico de prueba; pérdida aceptable. Backup formal solo en Fase 2 con RDS.
X) Otro

[Answer]: C

---

> Cuando termines de responder, escribe **"listo"** y genero los 2 artefactos (`infrastructure-design.md` + `deployment-architecture.md`).

---

## Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1=C, Q2=A, Q3=C, Q4=C — sin ambigüedades
- [x] Generar `infrastructure-design.md` — 15 secciones (deployment target, compute, storage, networking, Bedrock + SFCC config, env matrix, provisioning npm scripts, security infra, sizing)
- [x] Generar `deployment-architecture.md` — 11 secciones (deployment diagram, prerequisites, quick start 6 pasos, env matrix completa, .env.example, secrets flow, multistage Dockerfile, postgres init, rollback, demo day notes)
- [x] Verificar consistencia con SECURITY
- [x] Security compliance summary
- [x] Actualizar `aidlc-state.md`
- [ ] Presentar completion message (2-option)
