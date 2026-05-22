# NFR Design Plan — Unit 1: Core Agente

## Plan Overview

**Unit**: Unit 1 — Core Agente
**Purpose**: Traducir las NFRs en patrones de diseño concretos + listar componentes lógicos (caches, queues, breakers, etc.) que necesitamos en MVP.

**Filosofía MVP**: semana 2/4 + estación 5/12. Minimizar infra moving parts. Reusar lo que ya quedó decidido en Functional Design (retry, circuit breaker, rate limiter) y solo agregar lo estrictamente necesario.

**Input artifacts:**
- `construction/unit1-core-agente/nfr-requirements/nfr-requirements.md`
- `construction/unit1-core-agente/nfr-requirements/tech-stack-decisions.md`
- `construction/unit1-core-agente/functional-design/business-rules.md` (ya define R-TOOL-1..4, R-RATE-1..4, R-ERR-1..4)

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Resilience pattern para Bedrock (LLM calls)

Para las tools SFCC ya definimos: 3 retries con exp backoff (100/500/2000ms), circuit breaker 5 fail/30s, timeout 10s (R-TOOL-1..3). ¿Aplicamos el mismo pattern a las llamadas Bedrock?

A) **Mismo pattern para Bedrock que para SFCC tools** — consistencia, reusa el mismo helper `withRetry` y `withCircuitBreaker`. Bedrock LATAM puede tener throttling esporádico (TPM/RPM); 3 retries da margen.
B) **Menos agresivo para Bedrock** (2 retries, sin circuit breaker) — confiar más en Bedrock; si falla 5 veces ya hay un problema serio.
C) **Más agresivo** (5 retries, breaker más sensible) — paranoia injustificada para MVP.
X) Otro

[Answer]: A

---

### Question 2 — Caching strategy

¿Qué cacheamos en MVP?

A) **Sin cache** — brand config ya está en memoria (seed hardcoded en Unit 1); tool results NO se cachean por design (datos en tiempo real es el sentido del bot); `/widget/config` se sirve directo. Min moving parts.
B) **In-memory simple** (`Map` con TTL 5 min) para `/widget/config` solamente — alivia load si el widget abre muchas veces.
C) **In-memory simple para `/widget/config` + brand config** — en MVP no aplica al brand config (hardcoded), pero estructura el código para que Unit 2 (cuando cargue de DB) lo pueda usar.
X) Otro

[Answer]: A

---

### Question 3 — Connection pooling y keep-alive

¿Tunear conexiones a Postgres + HTTP (SFCC + Bedrock)?

A) **Defaults de cada lib** — `pg` pool default (10 conn) + `undici` keep-alive default + `@anthropic-ai/bedrock-sdk` defaults. Razonable para 50 conv simultáneas; no es premature optimization.
B) **Tuned conservative** — pool de 5 conexiones pg, max-sockets undici=10, timeouts más agresivos. Más predictible bajo presión.
C) **Tuned para 50 conv** — pool pg=20, max-sockets=30; cubre pico hipotético.
X) Otro

[Answer]: A

---

### Question 4 — Logical infrastructure components (MVP)

¿Qué componentes infra incluimos además de la app Node + Postgres?

A) **Solo app + Postgres** — sin Redis, sin queue, sin cache externo. Rate limiter usa Postgres (TD-9), jobs cron in-process (services.md §5.3).
B) **App + Postgres + Redis** — Redis para rate limiter (más performance) + cache opcional. Agrega un servicio Docker más.
C) **App + Postgres + Redis + BullMQ** — agregar queue para background jobs (cleanup, retention, alerts). Más resiliente pero más moving parts.
X) Otro

[Answer]: A

---

> Cuando termines de responder, escribe **"listo"** y genero los 2 artefactos (`nfr-design-patterns.md` + `logical-components.md`).

---

## Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1=A, Q2=A, Q3=A, Q4=A — sin ambigüedades
- [x] Generar `nfr-design-patterns.md` — 8 secciones (resilience, performance, scalability, security, reliability, maintainability, observability, security compliance)
- [x] Generar `logical-components.md` — topology Mermaid, component inventory, integration patterns, forward-looking pivots, Docker Compose esqueleto
- [x] Verificar consistencia con NFR requirements + business-rules
- [x] Security compliance summary
- [x] Actualizar `aidlc-state.md`
- [ ] Presentar completion message (2-option)
