---
id: 007-pipeline-orchestrator
title: "Pipeline orchestrator — 11 steps secuenciales con early-exit"
milestone: m3-business-logic
priority: high
estimation: XL
blockedBy: ["005-sfcc-tools-integration", "006-prompts-guardrails-services"]
blocks: ["008-api-layer-and-jobs"]
status: done
closed_by_commit: 5628ea9
---

## Summary

El corazón del Unit 1: pipeline runner que ejecuta 11 steps secuenciales contra un TurnContext compartido, con early-exit si algún step setea earlyExitReason. Cada step es una función pura que muta el contexto. Implementa el business-logic-model.md §1-§3 (pipeline 12-step según naming AI-DLC, 11 en código por consolidación de uno).

## Scope (deliverables)

- `hermes/src/services/orchestrator/turn-context.ts` — type TurnContext con todos los campos compartidos (input, brandConfig, identityResult, intent, toolResults, finalResponse, earlyExitReason, assistantTurnId, etc.)
- `hermes/src/services/orchestrator/pipeline.ts` — runPipeline runner + PipelineStep type + early-exit logic
- `hermes/src/services/orchestrator/steps/parse-request.step.ts` — resolveIdentity + ensureExists conversation (fix bug #6)
- `hermes/src/services/orchestrator/steps/consent-gate.step.ts` — evaluateConsent + captureConsent
- `hermes/src/services/orchestrator/steps/load-brand-config.step.ts` — brandConfigService.getActive
- `hermes/src/services/orchestrator/steps/input-guardrails.step.ts` — input.guards.eval
- `hermes/src/services/orchestrator/steps/classify-intent.step.ts` — detecta closing | product_search | order_status_query
- `hermes/src/services/orchestrator/steps/execute-tools.step.ts` — invoca tool según intent (get_order_status o search_products) + fix order_id case-insensitive (commit 8e9a557)
- `hermes/src/services/orchestrator/steps/generate-response.step.ts` — formatea response según intent
- `hermes/src/services/orchestrator/steps/output-guardrails.step.ts` — output.guards.eval
- `hermes/src/services/orchestrator/steps/persist-turn.step.ts` — insertTurn user + assistant + linkage assistantTurnId (fix bug #7)
- `hermes/src/services/orchestrator/steps/log-turn.step.ts` — turnLogRepo.insert con redacción + pii_token_map
- `hermes/src/services/conversation.service.ts` — handleTurn(input) wraps el pipeline

## Acceptance criteria

- [x] Pipeline arma steps array en orden + runPipeline ejecuta uno a uno
- [x] Early-exit funciona: consent_request, consent_denied, tool_unavailable
- [x] Intent detection: closing → farewell, product_search → tool, order_status_query → tool
- [x] FK linkage correcto: persist-turn guarda assistantTurnId en ctx → log-turn lo usa para turn_log_audit
- [x] ensure-conversation evita FK violation en captureConsent (bug #6)

## Test plan

- Unit: tests/unit/orchestrator/pipeline.test.ts — early-exits + happy path mocked
- Integration: chat.test.ts confirma flow completo con DB real
- Smoke suite 51/51 ejercita el pipeline completo en 10 casos

## Context

- Plan AI-DLC: Step 12 del plan U1 (más complejo, ~4h estimadas)
- Business logic model §1-§3: `functional-design/business-logic-model.md`
- Bugs corregidos durante implementación:
  - #6 conversation no creada antes de captureConsent
  - #7 log-turn inventaba turn_id (FK violation)
  - #8 error-handler no logeaba (diagnosis imposible)

## Definition of ready

- [x] Tools registrados (task 005)
- [x] Services definidos (task 006)
- [x] Pipeline model 12-step documentado en AI-DLC
