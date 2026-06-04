# Code Generation Plan — Unit 1: Core Agente

## Plan Overview

**Unit**: Unit 1 — Core Agente
**Type**: Greenfield single-unit monolith → estructura `hermes/src/` layered
**Workspace root**: `C:/Users/sosab/source/repos/Shopper_Assistant_chatboot/hermes/`
**Stories implementadas en esta unidad**: E1-S1, E1-S2, E1-S3, E1-S4, E1-S5, E1-S6, E2-S4 (7 stories de las 16 totales)
**MUST HAVE features cubiertas**: MH-1, MH-2, MH-5, MH-6, MH-7, MH-8, MH-10 (parcial MH-3 vía seed)

**Dependencies con otras units**:
- **Unit 1 establece la base** — sin dependencias hacia Unit 2 o Unit 3.
- Bootstrap brand config Patprimo es **hardcoded en código** (Unit 2 lo reemplaza con DB CRUD posteriormente).
- M2 Knowledge stub (returns []) — Unit 2 lo implementa.
- M5 Handoff trigger no se evalúa en pipeline Unit 1 (siempre `handoffTriggered: false`) — Unit 3 agrega.

**Filosofía MVP**: archivos pequeños, código directo, tests focalizados en path crítico (Caso 1 happy + 3-4 edge cases). Sin abstracción extra.

---

## Source of truth para esta generación

Esta sección define el **single source of truth** que cada step consulta:
- `aidlc-docs/inception/application-design/components.md` + `component-methods.md` + `services.md` + `application-design.md` — TS interfaces y layout exacto
- `aidlc-docs/construction/unit1-core-agente/functional-design/business-logic-model.md` — pipeline 12-step
- `aidlc-docs/construction/unit1-core-agente/functional-design/business-rules.md` — R-* rules numeradas
- `aidlc-docs/construction/unit1-core-agente/functional-design/domain-entities.md` — entidades + atributos
- `aidlc-docs/construction/unit1-core-agente/functional-design/frontend-components.md` — widget structure
- `aidlc-docs/construction/unit1-core-agente/nfr-design/nfr-design-patterns.md` — patterns (retry, breaker, error hierarchy, branded types)
- `aidlc-docs/construction/unit1-core-agente/nfr-design/logical-components.md` — Docker Compose final
- `aidlc-docs/construction/unit1-core-agente/infrastructure-design/infrastructure-design.md` + `deployment-architecture.md` — .env, scripts, Dockerfile

---

## Generation Steps (numerados, ejecutables en orden)

### Step 1: Project Structure Setup (greenfield) ✅ COMPLETE 2026-06-02
- [x] Crear directorio `hermes/` en la raíz del repo
- [x] Inicializar `hermes/package.json` con dependencies + scripts (per infrastructure-design.md §11)
- [x] Crear `hermes/tsconfig.json` (strict mode + `noUncheckedIndexedAccess` + `noUnusedLocals/Parameters`)
- [x] Crear `hermes/.gitignore` (node_modules, dist, .env, coverage, etc.)
- [x] Crear `hermes/.env.example` (template per deployment-architecture.md §5 + `SFCC_MODE` Plan B)
- [x] Crear `hermes/.eslintrc.json` + `hermes/.prettierrc` + `hermes/.editorconfig`
- [x] `hermes/src/app.ts` y `hermes/src/server.ts` placeholders funcionales (con `/health` endpoint)
- [x] `hermes/README.md` con quick start + links a docs canónicos en raíz
- **Subdirectorios `src/{config,plugins,controllers,services,repositories,models,tools/sfcc,prompts/patprimo,guardrails,lib,jobs}`**: se crearán implícitamente en Steps siguientes cuando contengan archivos. NO se crean con `.gitkeep` para evitar bloat.
- **Implements**: bootstrap del workspace
- **Stories**: prerequisito de todas
- **Archivos generados (9)**: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `.eslintrc.json`, `.prettierrc`, `.editorconfig`, `src/app.ts`, `src/server.ts`, `README.md`.

### Step 2: Database Migration Scripts ✅ COMPLETE 2026-06-02
- [x] `hermes/migrations/0001-init.sql` — 8 ENUMs + 5 tablas (`conversations`, `turns`, `tool_call_records`, `guardrail_events`, `rate_limit_buckets`) con constraints CHECK que enforcen invariantes de domain-entities.md
- [x] `hermes/migrations/0002-consent-log.sql` — append-only + REVOKE UPDATE/DELETE de `hermes_app` + GRANT SELECT/DELETE a `hermes_retention`
- [x] `hermes/migrations/0003-brand-config-seed.sql` — `brand_configs` con bootstrap Patprimo placeholder (system_prompt + few_shot reales se completan en Step 9 via `npm run seed`)
- [x] `hermes/migrations/0004-turn-log-audit.sql` — `pii_token_map` (write-only Unit 1) + `turn_log_audit` (append-only, retención ≥90d) con CHECK constraints
- [x] `hermes/migrations/0005-indexes.sql` — 11 indexes covering session-cleanup, dashboard drill-down, retention scans, alerting feeds, latency monitoring
- [x] `hermes/postgres-init.sql` — pgcrypto + pgvector extensions + roles `hermes_app` y `hermes_retention` con CONNECT + USAGE
- **Implements**: entidades del dominio (domain-entities.md §2-§10) + SECURITY-06/13/14
- **Stories**: prerequisito de E1-S2, E1-S6, E1-S1
- **Archivos generados (6)**: `postgres-init.sql`, `migrations/0001-init.sql`, `migrations/0002-consent-log.sql`, `migrations/0003-brand-config-seed.sql`, `migrations/0004-turn-log-audit.sql`, `migrations/0005-indexes.sql`.

### Step 3: Models (Zod schemas + TS types + branded types) ✅ COMPLETE 2026-06-02
- [x] `hermes/src/models/shared.ts` — branded types (`ConversationId`, `TurnId`, `ConsentId`, `ToolCallId`, `GuardrailEventId`, `PiiMapId`, `LogId`, `CustomerIdHash`, `RedactedText`, `PolicyVersion`, `BrandId`) + helpers `asBranded`/`asRedactedText`
- [x] `hermes/src/models/conversation.ts` — `Conversation` + `Turn` schemas con 5 ENUMs + 4 refinements (invariantes domain §2-§3)
- [x] `hermes/src/models/identity.ts` — `IdentityRequest`, `IdentityResult`, `CustomerProfile` (transient, NUNCA persistir)
- [x] `hermes/src/models/chat.ts` — `ChatRequest`/`ChatResponse` (POST /chat) + `TurnInput`/`TurnOutput` (orchestrator)
- [x] `hermes/src/models/order.ts` — `GetOrderStatusInput`/`Output`/`Result` con anti-enumeration `OrderNotFound`
- [x] `hermes/src/models/consent.ts` — `ConsentRecord` + `ConsentDecision` (granted/ambiguous)
- [x] `hermes/src/models/brand-config.ts` — `BrandConfig` + `FewShotExample` + helper `isCustomerFacingNamePlaceholder`
- [x] `hermes/src/models/turn-log.ts` — `TurnLogRecord` + `TurnLogInput` (con `RedactedText` branded — R-PII-4 enforced en compilador)
- [x] `hermes/src/models/errors.ts` — `HermesError` abstract + 9 subclasses (`ValidationError`, `IdentityError`, `ConsentDeniedError`, `GuardrailBlockedError`, `RateLimitError`, `BedrockError`, `SfccError`, `ToolUnavailableError`, `ConfigError`, `InternalError`) + `Result<T,E>` + `normalizeError` helper
- **Implements**: domain-entities.md + nfr-design-patterns.md §6.2-§6.3 + R-PII-4 a nivel de tipos
- **Stories**: foundation cross-story
- **Archivos generados (9)**: ver paths arriba.

### Step 4: Lib utilities
- [ ] `hermes/src/lib/hashing.ts` — sha256 customer_id hashing con salt
- [ ] `hermes/src/lib/retry.ts` — `withRetry<T>` helper (R-TOOL-1, NFR §1.1)
- [ ] `hermes/src/lib/circuit-breaker.ts` — `withCircuitBreaker<T>` helper (R-TOOL-2, NFR §1.2)
- [ ] `hermes/src/lib/timeout.ts` — `withTimeout<T>` helper
- [ ] `hermes/src/lib/pii-anonymizer.ts` — `anonymizePII(text)` con patrones R-PII-1
- [ ] `hermes/src/lib/correlation.ts` — `generateRequestId` + `generateTurnId`
- **Implements**: NFR design patterns + R-PII rules
- **Stories**: E1-S6 (PII anonymization), prerequisito de tool calls

### Step 5: Config + env validation
- [ ] `hermes/src/config/env.ts` — Zod schema validation de env vars al startup (fail-fast per NFR §4.3)
  - **Ajuste post-mayo 2026**: agregar `SFCC_MODE: z.enum(["real","mock"]).default("real")` per [project_demo_day_plan_b](memory/project_demo_day_plan_b.md). Plan B Demo Day: si SFCC sandbox cae, flip a `mock` en `.env` + `docker compose restart hermes` en <30s.
- **Implements**: SECURITY-09 + NFR §4.3
- **Stories**: prerequisito de todos

### Step 6: Repository layer
- [ ] `hermes/src/repositories/conversation.repo.ts` — CRUD conversations + turns
- [ ] `hermes/src/repositories/consent.repo.ts` — append-only consent_log + getLatest
- [ ] `hermes/src/repositories/turn-log.repo.ts` — INSERT only en turn_log_audit
- [ ] `hermes/src/repositories/brand-config.repo.ts` — SELECT brand_configs (Unit 1 solo read)
- [ ] `hermes/src/repositories/rate-limit.repo.ts` — increment + check buckets
- **Implements**: data access para domain entities
- **Stories**: foundation para services

### Step 7: Plugins (Fastify decorations + infrastructure)
- [ ] `hermes/src/plugins/postgres.plugin.ts` — `fastify.pg` pool decoration
- [ ] `hermes/src/plugins/bedrock.plugin.ts` — `fastify.bedrock` client decoration
- [ ] `hermes/src/plugins/error-handler.plugin.ts` — CC-2 global error handler con mapping HermesError → HTTP
- [ ] `hermes/src/plugins/request-context.plugin.ts` — CC-3 correlation_id por request
- [ ] `hermes/src/plugins/security.plugin.ts` — helmet + cors + rate-limit con storage Postgres
- **Implements**: NFR patterns §4.2, §4.4, §4.5, §4.6
- **Stories**: foundation cross-story

### Step 8: Tools (SFCC integrations)
- [ ] `hermes/src/tools/tool-registry.ts` — registro genérico + interface ToolSpec
- [ ] `hermes/src/tools/sfcc/sfcc-client.ts` — interface `ISFCCClient` + factory que elige `RealSFCCClient` o `MockSFCCClient` según `SFCC_MODE`
- [ ] `hermes/src/tools/sfcc/real-sfcc-client.ts` — OAuth client + undici HTTP con keep-alive + token cache (renombrado del sfcc-client.ts original)
- [ ] `hermes/src/tools/sfcc/mock-sfcc-client.ts` — **Plan B Demo Day**: lee `hermes/fixtures/demo-orders.json` con 3-4 pedidos demo. Determinístico, 100% offline-capable.
- [ ] `hermes/fixtures/demo-orders.json` — 3-4 pedidos Patprimo (`PP-2026-XXXX`) con status en_transito/entregado/procesando, ETAs, # guía.
- [ ] `hermes/src/tools/sfcc/get-order-status.tool.ts` — implementación del tool envuelto en retry + breaker + timeout (usa la factory)
- **Implements**: M3 SFCC integrations + R-TOOL-1..4 + Plan B Demo Day
- **Stories**: E1-S3

### Step 9: Prompts (Patprimo seed)
- [ ] `hermes/src/prompts/patprimo/system.prompt.ts` — system prompt hardened de Patprimo
- [ ] `hermes/src/prompts/patprimo/few-shot.ts` — 10–20 ejemplos few-shot (orden: greeting, order_status happy, order_status not_found, out_of_scope deflection, edge cases)
- [ ] `hermes/src/prompts/patprimo/texts.ts` — `consentRequestText`, `consentDeniedText`, `neutralFallbackText`
- **Implements**: M8 seed Patprimo
- **Stories**: E1-S1, E1-S4

### Step 10: Guardrails
- [ ] `hermes/src/guardrails/input.guards.ts` — patterns R-GUARD-IN-1 (regex categorías + Boolean evaluator)
- [ ] `hermes/src/guardrails/output.guards.ts` — patterns R-GUARD-OUT-1 (grounding check, no-secret-leak, no-competitor, etc.)
- **Implements**: R-GUARD-IN-* + R-GUARD-OUT-* rules
- **Stories**: E1-S5

### Step 11: Services (business logic)
- [ ] `hermes/src/services/session.service.ts` — M4: resolveIdentity (SFCC session vs guest matching), appendTurn, getConversation
- [ ] `hermes/src/services/compliance.service.ts` — M6: anonymizePII (uses lib), requireConsent gate, captureConsent
- [ ] `hermes/src/services/brand-config.service.ts` — M8 stub Unit 1: getActive retorna seed Patprimo
- [ ] `hermes/src/services/logger.service.ts` — M7 write-path: logTurn estructurado con redacción obligatoria
- [ ] `hermes/src/services/knowledge.service.ts` — M2 stub: search retorna []
- **Implements**: M4, M6, M7 write, M8 read seed, M2 stub
- **Stories**: E1-S1, E1-S2, E1-S6

### Step 12: Pipeline orchestrator (M1 — corazón del Unit 1)
- [ ] `hermes/src/services/orchestrator/turn-context.ts` — type TurnContext shared
- [ ] `hermes/src/services/orchestrator/steps/parse-request.step.ts`
- [ ] `hermes/src/services/orchestrator/steps/resolve-identity.step.ts`
- [ ] `hermes/src/services/orchestrator/steps/consent-gate.step.ts`
- [ ] `hermes/src/services/orchestrator/steps/load-brand-config.step.ts`
- [ ] `hermes/src/services/orchestrator/steps/input-guardrails.step.ts`
- [ ] `hermes/src/services/orchestrator/steps/classify-intent.step.ts` — invoca Bedrock con system + few-shot + tools
- [ ] `hermes/src/services/orchestrator/steps/execute-tools.step.ts` — tool dispatch
- [ ] `hermes/src/services/orchestrator/steps/generate-response.step.ts` — segunda llamada LLM si hubo tool_use
- [ ] `hermes/src/services/orchestrator/steps/output-guardrails.step.ts`
- [ ] `hermes/src/services/orchestrator/steps/persist-turn.step.ts`
- [ ] `hermes/src/services/orchestrator/steps/log-turn.step.ts`
- [ ] `hermes/src/services/orchestrator/pipeline.ts` — array de steps + ejecutor secuencial con early-exit
- [ ] `hermes/src/services/conversation.service.ts` — M1: `handleTurn(input)` invoca el pipeline
- **Implements**: business-logic-model.md §1-§3 (pipeline 12-step)
- **Stories**: E1-S1, E1-S2, E1-S3, E1-S4, E1-S5, E1-S6 (todas convergen aquí)

### Step 13: API Layer (controllers + routes)
- [ ] `hermes/src/controllers/chat.controller.ts` — `POST /chat` (Zod validation + invoca ConversationService)
- [ ] `hermes/src/controllers/ab.controller.ts` — `GET /ab/decide` (stub Unit 1: siempre retorna `{target: "hermes"}`)
- [ ] `hermes/src/controllers/health.controller.ts` — `GET /health` + `GET /health/ready`
- [ ] `hermes/src/controllers/widget-config.controller.ts` — `GET /widget/config?brand=X` — sirve texts del brand config seed
- [ ] `hermes/src/controllers/widget-static.controller.ts` — `GET /widget/widget.js` + `.css` desde `hermes/widget/public/`
- [ ] `hermes/src/plugins/m1-conversation.plugin.ts` — registra el chat controller como Fastify plugin
- [ ] `hermes/src/plugins/m3-sfcc.plugin.ts` — registra tool registry
- [ ] `hermes/src/plugins/m4-session.plugin.ts`
- [ ] `hermes/src/plugins/m6-compliance.plugin.ts`
- [ ] `hermes/src/plugins/m7-observability.plugin.ts`
- [ ] `hermes/src/plugins/m8-brand-config.plugin.ts` — versión stub
- **Implements**: HTTP API layer
- **Stories**: E1-S1, E1-S2, E1-S3

### Step 14: Background Jobs
- [ ] `hermes/src/jobs/session-cleanup.job.ts` — corre cada 30 min via `node-cron`, marca conversations stale como closed (R-SESS-2)
- [ ] `hermes/src/jobs/retention.job.ts` — corre daily, purga turn_log_audit > 90d (corre con rol `hermes_retention`)
- [ ] `hermes/src/jobs/job-runner.ts` — registra los jobs en startup
- **Implements**: R-SESS-2, SECURITY-14 retention
- **Stories**: E1-S6 (retention enforcement)

### Step 15: Composition root + entrypoints
- [ ] `hermes/src/app.ts` — CC-1: construye Fastify, registra plugins en orden, retorna instance
- [ ] `hermes/src/server.ts` — entry point: load env, build app, listen, handle SIGTERM graceful shutdown
- [ ] `hermes/src/migrate.ts` — script que invoca `postgres-migrations` con la conexión configurada
- [ ] `hermes/src/seed.ts` — script de seed para datos de demo (insert sample orders en mock, brand_config v1)
- **Implements**: CC-1 + graceful shutdown (NFR §5.3)
- **Stories**: foundation

### Step 16: Frontend Widget (vanilla JS bundle)
- [ ] `hermes/widget/src/index.ts` — entry, exporta `initHermesWidget(config)`
- [ ] `hermes/widget/src/core/widget-state.ts` — state manager + emitter
- [ ] `hermes/widget/src/core/api-client.ts` — fetch wrapper
- [ ] `hermes/widget/src/core/event-bus.ts`
- [ ] `hermes/widget/src/components/widget-root.ts`
- [ ] `hermes/widget/src/components/widget-header.ts`
- [ ] `hermes/widget/src/components/message-list.ts`
- [ ] `hermes/widget/src/components/message-bubble.ts`
- [ ] `hermes/widget/src/components/input-area.ts`
- [ ] `hermes/widget/src/components/consent-prompt.ts`
- [ ] `hermes/widget/src/components/handoff-button.ts` (placeholder Unit 1)
- [ ] `hermes/widget/src/components/error-banner.ts`
- [ ] `hermes/widget/src/styles/widget.css` — mobile-first BEM. **Aplicar 4 gaps del widget audit** (per [project_widget_audit_findings](memory/project_widget_audit_findings.md)): `env(safe-area-inset-bottom)` + `env(safe-area-inset-right)` en `.widget-bubble--closed` para iOS notch; touch target `min-height: 44px; min-width: 44px` (WCAG 2.5.5).
- **Widget audit gaps adicionales** (aplicar durante Step 16):
  - `translate="no"` en lockup "Sofía de Patprimo", "Hermes", `customerFacingName` y order IDs (`PP-2026-XXXX`, `HT-2026-XXXX`) → evita Chrome auto-translate
  - `aria-label="Escribe tu mensaje"` en el `<textarea>` del input-area (no hay label visible)
  - Listener de tecla `Escape` para cerrar widget abierto (additional a botón cerrar)
  - `prefers-reduced-motion` variant para hover scale del bubble
- [ ] `hermes/widget/src/i18n/es-CO.ts` — strings Patprimo
- [ ] `hermes/widget/package.json` + `hermes/widget/tsconfig.json` + `hermes/widget/esbuild.config.mjs`
- [ ] `hermes/widget/README.md` — instrucciones de integración SFCC
- **Implements**: frontend-components.md
- **Stories**: E1-S1, E1-S2 (UI), E1-S3 (chat flow), E3-S4 placeholder

### Step 17: Tests (focalizados en path crítico)
- [ ] `hermes/tests/unit/lib/pii-anonymizer.test.ts` — PBT con fast-check + casos directos
- [ ] `hermes/tests/unit/lib/retry.test.ts` — retry behavior (success, fail, exhaust)
- [ ] `hermes/tests/unit/lib/circuit-breaker.test.ts` — state transitions
- [ ] `hermes/tests/unit/guardrails/input.test.ts` — patterns + edge cases + 10+ jailbreak attempts
- [ ] `hermes/tests/unit/guardrails/output.test.ts` — grounding violations + safe responses
- [ ] `hermes/tests/unit/services/orchestrator/pipeline.test.ts` — pipeline early-exits + happy path mocked
- [ ] `hermes/tests/unit/services/compliance/anonymize.test.ts`
- [ ] `hermes/tests/integration/chat-happy.test.ts` — supertest contra Fastify, mock Bedrock + SFCC, Caso 1 end-to-end
- [ ] `hermes/tests/integration/chat-consent.test.ts` — flujos consent granted/denied/repeat
- [ ] `hermes/tests/integration/chat-guardrail.test.ts` — input + output block paths
- [ ] `hermes/tests/integration/health.test.ts` — `/health` + `/health/ready`
- [ ] `hermes/vitest.config.ts` — coverage thresholds 70% lines, exclude legacy paths
- **Implements**: NFR §6.2 + PBT extension activa
- **Stories**: traceability test → AC Gherkin

### Step 18: Documentation + READMEs
- [ ] `hermes/README.md` — quick start + arquitectura overview + links a aidlc-docs
- [ ] `aidlc-docs/construction/unit1-core-agente/code/code-generation-summary.md` — markdown summary listando todos los archivos generados + mapping a stories
- [ ] `aidlc-docs/construction/unit1-core-agente/code/api-spec.md` — OpenAPI-like resumen de endpoints
- **Implements**: documentation requirements
- **Stories**: cross-story

### Step 19: Deployment Artifacts
- [ ] `hermes/Dockerfile` — multistage build (per infrastructure-design.md §7.1)
- [ ] `hermes/docker-compose.yml` — final 2-service composition (per logical-components.md §7)
- [ ] `hermes/scripts/wait-for-postgres.sh` — helper para healthcheck startup ordering (opcional)
  - **Ajuste post-mayo 2026**: `.env.example` (creado en Step 1) debe incluir `SFCC_MODE=real` con comentario `# Plan B Demo Day: cambiar a 'mock' para usar fixtures de hermes/fixtures/demo-orders.json sin SFCC real`.
- **Implements**: deployment-architecture.md §7 + Plan B Demo Day
- **Stories**: foundation

---

## Estimación de scope

| Step | Files | Time estimate (1 dev) |
|---|---|---|
| 1 Setup | ~10 | 0.5h |
| 2 Migrations | 6 | 1h |
| 3 Models | 9 | 1.5h |
| 4 Lib | 6 | 1.5h |
| 5 Config | 1 | 0.5h |
| 6 Repositories | 5 | 2h |
| 7 Plugins infra | 5 | 1.5h |
| 8 Tools SFCC | 3 | 2h |
| 9 Prompts | 3 | 1.5h (calidad few-shot) |
| 10 Guardrails | 2 | 1.5h |
| 11 Services | 5 | 2.5h |
| 12 Pipeline | 14 | 4h (core complejo) |
| 13 Controllers + plugins M*-* | 11 | 2h |
| 14 Jobs | 3 | 0.5h |
| 15 Entrypoints | 4 | 1h |
| 16 Widget | 16 | 5h |
| 17 Tests | 12 | 6h |
| 18 Docs | 3 | 1h |
| 19 Deployment | 3 | 1h |
| **Total** | **~120 archivos** | **~36h** (≈ 1 semana sólida) |

> **Compatible con week 3 del MVP** (después de Estación 5). Units 2 y 3 corren después.

---

## Story coverage final

| Story | Steps relevantes | Status post Step 19 |
|---|---|---|
| E1-S1 saludo + consent | 2, 9, 11, 12, 13, 16 | ✅ complete |
| E1-S2 identificación dual | 2, 8, 11, 12, 13 | ✅ complete |
| E1-S3 tool call | 8, 12, 13 | ✅ complete |
| E1-S4 voz Patprimo | 9, 11, 12 | ✅ complete (seed bootstrap) |
| E1-S5 guardrails | 10, 12, 17 | ✅ complete |
| E1-S6 logging | 2, 4, 6, 11, 12, 14 | ✅ complete |
| E2-S4 Fase 0 baseline | 11, 18 | ✅ complete (LoggerService listo; baseline script en `hermes/scripts/baseline.ts` parte de Step 19) |

---

## Critical execution rules

1. **NEVER create app code en `aidlc-docs/`** — todo en `hermes/`.
2. **NEVER duplicar archivos** — esto es greenfield, no brownfield.
3. **Marcar [x] cada step inmediatamente** al completar.
4. **Tests obligatorios mínimos** para llegar a coverage target (Step 17).
5. **NO desviarse del plan** — si algo está mal en el plan, parar y replanificar; no improvisar mid-generación.

---

## Generation Checklist global

- [x] Plan aprobado por el usuario (Part 1 complete — aprobado 2026-06-02 con 2 ajustes post-mayo)
- [ ] Step 1-19 completados (Part 2 — Step 1 ✅ done; Step 2 esperando aprobación de cadencia step-by-step)
- [ ] Coverage report ≥70% lines en código de negocio
- [ ] `docker compose up -d && npm run migrate && npm run seed` levanta el sistema
- [ ] `curl /health/ready` retorna 200
- [ ] `curl POST /chat` smoke test del Caso 1 verde
- [ ] aidlc-state.md actualizado: Unit 1 Code Generation complete
- [ ] Completion message con 2-option presentado

---

## ⚠️ Important note — execution may span multiple turns

Dado el volumen (~120 archivos, ~36h de trabajo equivalente), Part 2 (Generation) **probablemente se ejecutará en varias sesiones**. Cada sesión:

1. Lee este plan desde `aidlc-docs/construction/plans/unit1-core-agente-code-generation-plan.md`
2. Encuentra el primer step con `[ ]`
3. Ejecuta ese step (puede ser 1 archivo o varios cohesivos)
4. Marca `[x]`
5. Continúa o se detiene si el usuario indica pausa

Cuando todos los steps estén `[x]`, se cierra Code Generation con el completion message.
