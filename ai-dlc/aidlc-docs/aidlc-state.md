# AI-DLC State Tracking — Hermes

## Project Information
- **Project Name**: Hermes — Agente Conversacional de IA para grupo PASH SAS
- **Project Type**: Greenfield
- **Start Date**: 2026-05-20T00:11:43Z
- **Current Stage**: INCEPTION — Workspace Detection
- **Input PRD**: `ai-dlc/prd.md` (88 KB, 13 segmentos consolidados)

## Workspace State
- **Existing Code**: No
- **Programming Languages**: N/A (no source code yet)
- **Build System**: N/A
- **Project Structure**: Empty (only AI-DLC tooling + PRD + docs)
- **Reverse Engineering Needed**: No
- **Workspace Root**: `C:/Users/sosab/source/repos/Shopper_Assistant_chatboot/ai-dlc/`

## Code Location Rules
- **Application Code**: Workspace root `ai-dlc/` (NEVER in `aidlc-docs/`)
- **Documentation**: `ai-dlc/aidlc-docs/` only
- **Structure patterns**: To be determined in Workflow Planning / Code Generation per `code-generation.md`

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | Yes | Requirements Analysis (Q1 = A) |
| Property-Based Testing | Yes | Requirements Analysis (Q2 = A) |

## User Answers (from `inception/requirements/requirement-verification-questions.md`)
| Q | Topic | Answer |
|---|---|---|
| Q1 | Security Baseline ext | A — Enable |
| Q2 | PBT ext | A — Enable |
| Q3 | Iteration scope | A — MUST HAVE only (MH-1 to MH-10) |
| Q4 | Stack | C — TypeScript + Node + Fastify/Express |
| Q5 | Conversation state store | B — PostgreSQL (single instance, also pgvector) |
| Q6 | Code location | C — `hermes/` subfolder (sibling of `ai-dlc/`) |
| Q7 | MVP deployment | A — Local-only Docker Compose |
| Q8 | Unit decomposition | C — 3 units by dependency/use-case |

## Stage Progress
### 🔵 INCEPTION PHASE
- [x] Workspace Detection (greenfield, no existing code)
- [ ] Reverse Engineering (skipped — N/A greenfield)
- [x] Requirements Analysis (comprehensive depth, document at `inception/requirements/requirements.md`)
- [x] User Stories (complete — 7 personas + 16 stories across 4 Epics; coverage 10/10 MH features; INVEST validated)
- [x] Workflow Planning (complete — execution plan at `inception/plans/execution-plan.md`)
- [x] Application Design (complete — Standard depth — 5 docs en `inception/application-design/`; ADR-1..7 definidos; layout `hermes/` definido)
- [x] Units Generation (complete — Minimal depth — 3 artifacts en `inception/application-design/`: unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md. 16 stories mapeadas, 10/10 MH coverage)

### 🟢 CONSTRUCTION PHASE (Per-Unit Loop × 3, secuencial)
- [x] Unit 1 — Core Agente: **FD ✅ → NFR-R ✅ → NFR-D ✅ → ID ✅ → CG ✅** (CG completo 2026-06-04; smoke caso 1 verde end-to-end con SFCC_MODE=mock; 8 bugs estructurales del code gen arreglados durante smoke — ver commit `ac396fd`)
- [ ] Unit 2 — Knowledge & Brand Voice: **FD ✅ → NFR-R ✅ → NFR-D ✅ → ID ✅** → CG (CG diferido)
- [ ] Unit 3 — Handoff & Despliegue Gradual: **FD ✅ → NFR-R ✅ → NFR-D ✅ → ID ✅** → CG (todos los stages de diseño aprobados 2026-05-25; OD-7 cerrada; Demo Day runbook documentado)
- [x] Build and Test ✅ COMPLETE (2026-05-25) — 5 instruction docs en `aidlc-docs/construction/build-and-test/`; OD-8 (CI/CD) cerrada como Fase 2 candidate

### 🟡 OPERATIONS PHASE
- [ ] Operations (PLACEHOLDER — fuera de scope MVP)

## Execution Plan Summary
- **Total stages remaining**: 18 stage-executions (2 inception + 5×3 construction per-unit + 1 build/test)
- **Stages to skip**: Reverse Engineering (greenfield), Operations (placeholder)
- **Timeline target**: Demo Day 2026-06-09 (20 días desde hoy)
- **Buffer**: 1 día entre Build/Test y Demo Day — riesgo alto, mitigación = degradar Unit 2 a "brand config mínimo" si Unit 1 se extiende

## Current Status
- **Lifecycle Phase**: INCEPTION ✅ COMPLETE — **CONSTRUCTION ✅ COMPLETE (Unit 1 código + smoke caso 1 verde; Unit 2/3 diferidos a Fase 2)** — OPERATIONS placeholder.
- **Current Stage**: Unit 1 Code Generation ✅ COMPLETE (2026-06-04) — código en `hermes/` + smoke caso 1 end-to-end verde con SFCC_MODE=mock. Stack Docker corriendo: postgres-pgvector healthy, mailhog up, hermes-hermes healthy. Commits: `5628ea9` (código) + `ac396fd` (8 hotfixes).
- **Demo Day**: 2026-06-09 — T-5 días. Hermes operativo localmente, listo para integración SFCC sandbox.
- **Next operativo**: (1) integrar widget en sandbox SFCC personal vía Cloudflare Tunnel (per `project_sfcc_integration_plan`), (2) probar más casos del runbook (pedido inexistente, consent denied, jailbreak), (3) grabar video Plan B con sistema funcional.
- **Code Generation status**: U1 ✅ COMPLETO / U2 diferido Fase 2 / U3 diferido Fase 2 (decisión explícita del usuario per `feedback_demo_day_priority` 2026-06-04: proteger Demo Day sobre scope).
- **8 bugs del code gen Unit 1 arreglados durante smoke** (commit `ac396fd`): docker-init SQL var syntax, pg ESM imports, NOW() en index predicate, bedrock SDK incompat, AFFIRMATIVE regex strict, pipeline no creaba conversation row, log-turn inventaba turn_id (FK violation), error-handler silenciaba errores. Detalles en commit.
- **Refactor coherencia documental Oct8ne** ✅ COMPLETO (2026-06-01) — 13 archivos en `aidlc-docs/inception/*` + `specs/prd.md` alineados al lenguaje post-resolución blocker. Naming canónico Inception alineado a Unit 3: `dispatchHandoff()`, `IRolloutGate.shouldServeHermes()`, `system_config`, `/widget/config`, `0003_unit3_handoff_rollout.sql`.
- **Blocker Docker pull (2026-06-02) RESUELTO 2026-06-04** — root cause: MTU mismatch en red ISP cortando blobs >20MB de CloudFront-Docker. Solución: Cloudflare WARP activado en máquina del usuario. Las 3 imágenes en cache local (pgvector/pgvector:pg16, node:20-alpine, mailhog/mailhog).
