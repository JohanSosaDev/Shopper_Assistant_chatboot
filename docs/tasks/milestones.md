# Hermes — Milestones de la planning wave Unit 1

Mapping conceptual de las 12 tasks de la planning wave `hermes-unit1-core-agente-implementation` agrupadas en 5 milestones secuenciales con dependencias.

## M1: Foundation

**Goal:** Establecer las bases del proyecto: estructura, esquema de datos, y modelos de dominio que todo el código posterior va a usar.

**Tasks:**
- `001-project-bootstrap-and-schema` — package.json, tsconfig, .env.example, eslint/prettier, server placeholder, 5 migrations SQL + roles + extensions
- `002-domain-models-and-libs` — 9 modelos Zod con branded types + 6 lib utilities (hashing, retry, circuit-breaker, timeout, PII anonymizer, correlation)
- `003-config-and-repos` — env validation Zod + 5 repositories Postgres (conversation, consent, turn-log, brand-config, rate-limit)

**Definition of done:** TypeScript compila clean, migrations corren contra Postgres local, repositorios devuelven queries válidas.

---

## M2: Infrastructure

**Goal:** Capa de plugins Fastify (decorators infra) + integración con el sistema externo (SFCC mock/real).

**Tasks:**
- `004-infrastructure-plugins` — 5 plugins Fastify (postgres pool decorator, bedrock plugin, error-handler global, request-context correlation_id, security helmet+CORS+rate-limit)
- `005-sfcc-tools-integration` — Tool registry genérico + interface ISFCCClient + 2 implementaciones (mock con fixtures + real con OAuth/undici) + 2 tools (get_order_status, search_products)

**Definition of done:** Plugins registrados sin errores, mock SFCC devuelve datos válidos desde fixtures, real SFCC stub no rompe en SFCC_MODE=mock.

---

## M3: Business Logic

**Goal:** El corazón del agente: prompts + guardrails + servicios de negocio + pipeline orchestrator de 11 steps secuenciales con early-exit.

**Tasks:**
- `006-prompts-guardrails-services` — Prompts Patprimo (system + few-shot + texts) + guardrails input/output + 6 servicios (session, compliance, brand-config, logger, knowledge stub, conversation)
- `007-pipeline-orchestrator` — Pipeline runner + 11 steps (parse-request, consent-gate, load-brand-config, input-guardrails, classify-intent, execute-tools, generate-response, output-guardrails, persist-turn, log-turn) + turn-context

**Definition of done:** Pipeline corre end-to-end con todos los happy paths del Caso 1 verde. Early-exit funciona en consent_request/denied y tool_unavailable.

---

## M4: API & Widget

**Goal:** Capa HTTP que expone el agente al mundo + jobs en background + entrypoints + widget cliente vanilla TS embebible.

**Tasks:**
- `008-api-layer-and-jobs` — 4 controllers (chat, health, widget-config, widget-static) + 6 plugins de feature (m1/m3/m4/m6/m7/m8) + 3 background jobs (session-cleanup, retention, job-runner)
- `009-composition-root-entrypoints` — app.ts composition root + server.ts entry + migrate.ts + seed.ts
- `010-frontend-widget` — Bundle vanilla TS con esbuild IIFE: 13 componentes (root, header, message-list, message-bubble, input-area, consent-prompt, handoff-button, error-banner) + core (state, event-bus, api-client) + i18n + CSS mobile-first

**Definition of done:** `npm start` levanta servidor en :3000, `/health/ready` 200, `/widget/widget.js` sirve el bundle, click en FAB del widget abre la ventana de chat.

---

## M5: QA & Deploy

**Goal:** Cobertura de tests + documentación operativa + artefactos para correr en cualquier entorno.

**Tasks:**
- `011-tests-suite` — Vitest unit + PBT con fast-check + integration con supertest + smoke suite custom (51 checks que cubren 10 casos)
- `012-documentation-and-deployment` — README + architecture.md + Dockerfile multistage + docker-compose.yml + docker-init/ scripts + demo-day-runbook + npm run demo launcher

**Definition of done:** `npm run demo` arranca el stack completo en cold start + tunnel up con URL pública, smoke suite 51/51 verde.

---

## Grafo de dependencias (simplificado)

```
M1: Foundation
  001 ──► 002 ──► 003
                   │
M2: Infrastructure │
  004 ◄────────────┘
  005 ◄── 002

M3: Business Logic
  006 ◄── 003
  007 ◄── 005, 006

M4: API & Widget
  008 ◄── 004, 007
  009 ◄── 008
  010 ◄── 009

M5: QA & Deploy
  011 ◄── 009, 010
  012 ◄── 009
```

## Status

Todas las 12 tasks están en `status: done`. Cada una referencia el commit que las cerró en su frontmatter (`closed_by_commit`). Mapping de tasks a issues de GitHub vive en `docs/tasks/github-publish.yaml` después de ejecutar el publisher.
