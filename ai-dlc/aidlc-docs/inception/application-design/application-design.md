# Application Design — Hermes (Consolidated)

**Project**: Hermes — Agente Conversacional de IA, grupo PASH SAS
**Stage**: Inception / Application Design (Standard depth)
**Date**: 2026-05-20
**Inputs**: `requirements.md` · `stories.md` · `personas.md` · `prd.md` · respuestas Q1–Q7 de `application-design-plan.md`

> Este documento consolida los 4 artefactos detallados de Application Design. Para detalle navegar a:
> - [components.md](./components.md) — componentes M1–M8 + cross-cutting con responsabilidades e interfaces TS
> - [component-methods.md](./component-methods.md) — TS interfaces con method signatures
> - [services.md](./services.md) — service layer, orquestación, communication patterns
> - [component-dependency.md](./component-dependency.md) — matriz de dependencias, data flows

---

## 1. Architecture Overview

### 1.1 Decisiones arquitectónicas (de Q1–Q7)

| # | Decisión | Valor | Origen |
|---|---|---|---|
| ADR-1 | Estilo arquitectónico | **Monolithic Fastify app con plugin per module** | Q1=A |
| ADR-2 | Dependency injection | **`fastify.decorate` nativo** (no container externo) | Q2=D |
| ADR-3 | Data access | **`pg` driver crudo + SQL manual + migrations file-based** (sin ORM) | Q3=D |
| ADR-4 | Cliente LLM | **`@anthropic-ai/bedrock-sdk`** (Anthropic SDK con Bedrock backend) | Q4=B |
| ADR-5 | Validación | **Zod** con `fastify-type-provider-zod` | Q5=A |
| ADR-6 | Project structure | **Single package** (un `package.json` en `hermes/`) | Q6=A |
| ADR-7 | Folder organization | **Layered** (`controllers/` `services/` `repositories/` `models/`) | Q7=A |

### 1.2 Stack final consolidado

```text
Lenguaje:        TypeScript (strict)
Runtime:         Node.js ≥20 LTS
Web framework:   Fastify (monolithic plugin pattern)
Validación:      Zod + fastify-type-provider-zod
DB:              PostgreSQL ≥16 con extensión pgvector
DB driver:       pg (raw driver) — sin ORM
Migrations:      node-pg-migrate (a confirmar en NFR Design / Code Gen)
LLM SDK:         @anthropic-ai/bedrock-sdk
LLM modelo:      Claude Haiku 4.5 vía Bedrock LATAM
Tools HTTP:      undici (decisión final Code Gen) para SFCC + Oct8ne
Background jobs: node-cron / setInterval (in-process)
Logger:          pino (estándar Fastify; estructurado JSON)
Container:       Docker Compose (app + postgres)
Tests:           Vitest + Supertest (a confirmar en Build/Test)
```

---

## 2. Workspace layout

```text
hermes/
├── package.json                         # single package (ADR-6)
├── tsconfig.json
├── docker-compose.yml                   # app + postgres + (futuro) redis stub
├── Dockerfile
├── .env.example                          # sin secrets
├── migrations/                          # node-pg-migrate / SQL files versionados
│   ├── 0001_init.sql
│   ├── 0002_consent_log.sql
│   └── ...
├── src/
│   ├── app.ts                           # composition root (CC-1)
│   ├── server.ts                        # entry point: load config, build app, listen
│   ├── config/
│   │   └── env.ts                       # Zod schema para env vars
│   ├── plugins/                         # 1 Fastify plugin por módulo (CC pattern)
│   │   ├── m1-conversation.plugin.ts
│   │   ├── m2-knowledge.plugin.ts
│   │   ├── m3-sfcc.plugin.ts
│   │   ├── m4-session.plugin.ts
│   │   ├── m5-handoff.plugin.ts
│   │   ├── m6-compliance.plugin.ts
│   │   ├── m7-observability.plugin.ts
│   │   ├── m8-brand-config.plugin.ts
│   │   ├── postgres.plugin.ts           # decora fastify.pg
│   │   ├── bedrock.plugin.ts            # decora fastify.bedrock
│   │   ├── error-handler.plugin.ts      # CC-2
│   │   └── request-context.plugin.ts    # CC-3
│   ├── controllers/                     # HTTP handlers (layer: input)
│   │   ├── chat.controller.ts
│   │   ├── ab.controller.ts
│   │   ├── admin/
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── brand-config.controller.ts
│   │   │   └── compliance.controller.ts
│   │   └── health.controller.ts
│   ├── services/                        # business logic
│   │   ├── conversation.service.ts
│   │   ├── knowledge.service.ts        # stub MVP
│   │   ├── sfcc-toolset.service.ts
│   │   ├── session.service.ts
│   │   ├── handoff.service.ts
│   │   ├── compliance.service.ts
│   │   ├── logger.service.ts
│   │   ├── dashboard.service.ts
│   │   ├── alerting.service.ts
│   │   ├── brand-config.service.ts
│   │   └── ab-routing.service.ts
│   ├── repositories/                    # data access (sql + pg)
│   │   ├── session.repo.ts
│   │   ├── consent.repo.ts
│   │   ├── turn-log.repo.ts
│   │   ├── handoff-log.repo.ts
│   │   ├── brand-config.repo.ts
│   │   └── ab-split.repo.ts
│   ├── models/                          # Zod schemas + TS types derivados
│   │   ├── conversation.ts
│   │   ├── identity.ts
│   │   ├── handoff.ts
│   │   ├── brand-config.ts
│   │   └── kpi.ts
│   ├── tools/                           # tool definitions consumidas por LLM
│   │   ├── tool-registry.ts
│   │   └── sfcc/
│   │       ├── get-order-status.tool.ts
│   │       └── (futuro: check-inventory.tool.ts)
│   ├── prompts/                         # system prompts + few-shot por marca
│   │   └── patprimo/
│   │       ├── system.prompt.ts
│   │       └── few-shot.ts
│   ├── guardrails/
│   │   ├── input.guards.ts             # detect prompt injection patterns
│   │   └── output.guards.ts            # detect violations en respuesta
│   ├── lib/                             # utilities: hashing, pii detection, retry, circuit-breaker
│   └── jobs/                            # background jobs
│       ├── session-cleanup.job.ts
│       ├── retention.job.ts
│       ├── ab-rollback.job.ts
│       └── alert-evaluator.job.ts
└── tests/
    ├── unit/                            # vitest, mocked deps
    ├── integration/                     # vitest + supertest contra Fastify app
    ├── e2e/                             # journeys completas (Patprimo Caso 1)
    ├── eval/                            # eval suite del agente (PRD §11)
    └── red-team/                        # guardrail penetration tests
```

---

## 3. Module-to-Unit mapping (Construction Phase)

| Componente | Unit 1 — Core Agente | Unit 2 — Knowledge & Brand Voice | Unit 3 — Handoff & Convivencia |
|---|---|---|---|
| M1 Conversation | ✅ Primary | ⊡ usa config de Unit 2 | ⊡ activa handoff Unit 3 |
| M2 Knowledge | — | ✅ Stub mínimo | — |
| M3 SFCC Integrations | ✅ Primary | — | ⊡ orderHistory para handoff |
| M4 Identity & Session | ✅ Primary | — | ⊡ histórico para handoff |
| M5 Handoff | — | — | ✅ Primary |
| M6 Compliance | ✅ Primary (PII + consent) | — | ⊡ PII anon en handoff log |
| M7 Observability | ✅ Primary (logger + base dashboard) | — | ⊡ dashboards adicionales |
| M8 Brand Configuration | — | ✅ Primary (config Patprimo) | ✅ Primary (A/B routing) |
| CC-1..4 Infraestructura | ✅ Primary | — | — |

**Unit 1 entrega Caso 1 end-to-end demo-able sin depender de Units 2 y 3** (con un brand_config seed hard-coded como bootstrap).

---

## 4. Cross-cutting concerns

| Concern | Implementación | Owner module |
|---|---|---|
| **Logging** | `pino` configurado en CC-1; cada request lleva `request_id` y `conversation_id` vía CC-3 | M7 |
| **Error handling** | `fastify.setErrorHandler` global; errores tipados con clase base `HermesError` | CC-2 |
| **Authentication** | Endpoints `/chat` y `/ab/decide` son públicos con consent gate; endpoints admin requieren JWT validado server-side por middleware | M6 + plugin admin |
| **PII handling** | M6 expone `anonymizePII()`; toda escritura a logs pasa por allí; PII en cleartext nunca persiste | M6 |
| **Rate limiting** | Plugin `@fastify/rate-limit` en `/chat` (e.g. 30 req/min por IP); throttling en admin | CC plugin |
| **CORS** | Restringido a `https://patprimo.com.co` (y otros origins SFCC); definido en plugin CORS | CC plugin |
| **Compression** | `@fastify/compress` para responses >1kb | CC plugin |
| **Health checks** | `/health` (liveness) y `/health/ready` (readiness incluye check Postgres + Bedrock) | controllers/health.controller.ts |
| **Migrations** | `npm run migrate` (CI/CD hook) | scripts/ |

---

## 5. Critical orchestration flows (resumen)

Ver `services.md` para diagramas detallados.

1. **Turno happy path Caso 1** — 11 pasos sync: Cliente → Controller → Validation Zod → ConversationService → SessionService (identity) → ComplianceService (consent gate) → BrandConfigService (load Patprimo) → Bedrock invoke (LLM) → SFCCToolset.getOrderStatus → Bedrock invoke (con tool result) → guardrails → log → response.
2. **Handoff** — 7 pasos: Trigger detectado → buildContextPackage → getConversation history → anonymizePII para log → transferToOct8ne → logHandoff → respond "te paso con una persona".
3. **A/B routing** — stateless por request: hash(sessionId) mod 100 < hermesPercent → 'hermes'; else 'oct8ne'. Job de rollback corre cada 5 min evaluando reglas.

---

## 6. Risk surface specific to this design

| Riesgo | Mitigación en este diseño |
|---|---|
| Una sola instancia Fastify crashea → todo cae | Docker `restart: unless-stopped` + health check con readiness probe (en Fase 2, ECS autoscaling) |
| `fastify.decorate` accidentalmente compartido entre tenants | MVP es single-tenant (Patprimo Col). Multi-tenancy se diseña explícitamente en Fase 2 — no se asume implícita |
| Cambios en system prompt sin sign-off | M8 `activate()` requiere `approvedBy` no-nulo; método throws si se intenta activar versión sin sign-off (defensa en código, no solo en UI) |
| PII se cuela a logs | TODO logging pasa por LoggerService → forzar `anonymizePII` en signatures (compile-time enforcement via TS types) |
| Bedrock LATAM no-disponible | Circuit breaker + fallback graceful: "estamos teniendo un problema, intenta en unos minutos"; alerta inmediata a Operador |
| pg driver crudo + SQL manual → SQL injection si se concatena | **REGLA NO NEGOCIABLE**: TODAS las queries usan parámetros (`$1`, `$2`, ...) y nunca string concatenation. Code Generation enforcear vía code review checklist + lint rule (`sql-template-strings` o equivalent) |

---

## 7. Security Compliance Summary

| Rule | Status | Stage donde se evalúa concretamente |
|---|---|---|
| SECURITY-05 (input validation) | **Compliant by design** — Zod validation en controllers; signature de services recibe tipos validados | Code Generation per unit |
| SECURITY-08 (access control) | **Compliant by design** — endpoints públicos vs admin separados; CORS restricted; JWT validation a definir middleware | Functional Design Unit 2 |
| SECURITY-11 (secure design) | **Compliant by design** — M6 aislado, rate limiting en plugin, abuse cases reconocidos en stories E1-S5 + risk surface §6 | Funcional Design Unit 1 + 3 |
| SECURITY-15 (error handling) | **Compliant by design** — CC-2 global error handler + fail-closed declarado en M6 consent gate | Code Generation |
| SECURITY-01, 02, 03, 04, 06, 07, 09, 10, 12, 13, 14 | **N/A en este stage** | NFR Design, Infrastructure Design, Code Generation, Build/Test |

*No hay findings bloqueantes en este stage.*

---

## 8. Open Decisions resueltas en esta stage

| OD | Decisión | Stage |
|---|---|---|
| OD-1 Fastify vs Express | **Fastify** (Q1) | Application Design |
| OD-2 Estrategia migración Postgres | `node-pg-migrate` (con `postgres-migrations` como alternativa) — a confirmar en Code Gen | (parcial — pendiente Code Gen) |
| OD-3 SDK Bedrock | `@anthropic-ai/bedrock-sdk` (Q4) | Application Design |
| OD-4 Biblioteca validación | Zod (Q5) | Application Design |

**Pendientes (a stages siguientes):**

| OD | Estado | Stage donde se cierra |
|---|---|---|
| OD-5 Frontend widget | Pending | Functional Design Unit 1 |
| OD-6 Tests stack | Pending (Vitest sugerido) | NFR Design / Build and Test |
| OD-7 Estrategia A/B Oct8ne (proxy vs feature flag) | Pending — diseñado a alto nivel | Functional Design Unit 3 |
| OD-8 CI/CD pipeline detalle | Pending | Build and Test |
