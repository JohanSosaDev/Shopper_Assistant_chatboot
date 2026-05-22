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
- [ ] Unit 1 — Core Agente: **FD ✅ → NFR-R ✅ → NFR-D ✅ → ID ✅** → CG
- [ ] Unit 2 — Knowledge & Brand Voice: **FD ✅ → NFR-R ✅ → NFR-D ✅ → ID ✅** → CG (CG diferido)
- [ ] Unit 3 — Handoff & Convivencia: FD → NFR-R → NFR-D → ID → CG (EXECUTE all stages)
- [ ] Build and Test (EXECUTE — after all 3 units)

### 🟡 OPERATIONS PHASE
- [ ] Operations (PLACEHOLDER — fuera de scope MVP)

## Execution Plan Summary
- **Total stages remaining**: 18 stage-executions (2 inception + 5×3 construction per-unit + 1 build/test)
- **Stages to skip**: Reverse Engineering (greenfield), Operations (placeholder)
- **Timeline target**: Demo Day 2026-06-09 (20 días desde hoy)
- **Buffer**: 1 día entre Build/Test y Demo Day — riesgo alto, mitigación = degradar Unit 2 a "brand config mínimo" si Unit 1 se extiende

## Current Status
- **Lifecycle Phase**: INCEPTION ✅ COMPLETE — **CONSTRUCTION RESUMED** ▶️
- **Current Stage**: Unit 2 ✅ design 100% complete (FD + NFR-R + NFR-D + ID aprobados). CG diferido.
- **Awaiting**: confirmación del usuario para transicionar a Unit 3 (per pacing memory).
- **Next**: Unit 3 — Functional Design (espera confirmación explícita del usuario antes de iniciar).
- **Code Generation status**: Unit 1 paused / Unit 2 design complete & CG diferido / Unit 3 design pending
