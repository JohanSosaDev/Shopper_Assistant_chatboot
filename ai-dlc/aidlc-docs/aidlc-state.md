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
- [ ] Unit 1 — Core Agente: **FD ✅ → NFR-R ✅ → NFR-D ✅ → ID ✅** → CG (rollback total 2026-05-20; CG pausado)
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
- **Lifecycle Phase**: INCEPTION ✅ COMPLETE — **CONSTRUCTION ✅ COMPLETE (sin código MVP)** — OPERATIONS placeholder.
- **Current Stage**: Build and Test ✅ COMPLETE (2026-05-25). 5 instruction docs generadas: build-instructions, unit-test-instructions, integration-test-instructions, performance-test-instructions, build-and-test-summary.
- **Awaiting**: aprobación explícita del usuario para Build and Test antes de declarar workflow AI-DLC completo (per AI-DLC rule).
- **Next**: 🟡 OPERATIONS (placeholder — no MVP scope). De facto, workflow AI-DLC documentación COMPLETO.
- **Code Generation status**: U1 rolled back / U2 deferred / U3 deferred — DISEÑO 100% en docs sin código generado.
- **🏁 Hito final del workflow AI-DLC docs**: TODO el documentación del MVP está completa (Inception + Construction × 3 Units × 4 design stages + Build and Test). Solo falta Code Generation cuando el usuario decida ejecutarla.
- **Pendientes diferidos (no bloquean Construction)**: refactor de `stories.md` (E3-S3, E4-S2, MH-4, MH-9) y `prd.md` (Oct8ne refs) por coherencia documental antes de presentar a CTO.
