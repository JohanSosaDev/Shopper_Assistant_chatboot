---
id: 011-tests-suite
title: "Tests suite: vitest unit + PBT + integration + smoke automatizada"
milestone: m5-qa-and-deploy
priority: med
estimation: L
blockedBy: ["009-composition-root-entrypoints", "010-frontend-widget"]
blocks: []
status: done
closed_by_commit: 8699fac
---

## Summary

Cobertura de tests focalizada en path crítico (no 100% coverage, sino 100% de los flujos que el demo va a ejercitar). Vitest para unit + integration. fast-check para PBT (extensión PBT activa per Q2). Supertest para integration de chat + health. Plus una smoke suite custom (`scripts/smoke-suite.mjs`) que ejecuta 10 casos contra el endpoint real con 51 checks totales, validando latencia + status + contenido de respuesta + tool linkage. Verde 51/51 en CI manual.

## Scope (deliverables)

Unit tests (`hermes/tests/unit/`):
- `lib/pii-anonymizer.test.ts` — PBT + casos directos
- `lib/retry.test.ts`, `lib/circuit-breaker.test.ts`, `lib/hashing.test.ts`
- `guardrails/input.test.ts` con 10+ jailbreak attempts
- `guardrails/output.test.ts` con grounding violations
- `orchestrator/pipeline.test.ts` — early-exits + happy mocked
- `services/{compliance,logger,session}.test.ts`

Integration tests (`hermes/tests/integration/`):
- `chat.test.ts` — supertest contra Fastify, Caso 1 end-to-end con mocks
- `health.test.ts` — /health + /health/ready

PBT (`hermes/tests/pbt/`):
- `anonymizer.pbt.test.ts` — propiedades del anonimizador

Smoke (`hermes/scripts/smoke-suite.mjs`):
- 10 casos: 7 estados del enum order + anti-enumeration + consent denied + multi-turn
- 51 checks: HTTP status + latencia + texto respuesta + tools_called linkage
- Cross-platform Node ESM, sin dependencias extras

Config (`hermes/`):
- `vitest.config.ts` — coverage thresholds 70% lines
- `vitest.integration.config.ts` — config separada para integration

## Acceptance criteria

- [x] `npm test` corre todos los unit + PBT (~52 tests verde)
- [x] `npm run smoke:suite` → 51/51 checks verde (~6s)
- [x] Coverage report disponible con `npm run test:coverage`
- [x] PBT no encuentra contraejemplos en 100 runs por property

## Test plan

- Self-meta: los tests ejercitan el código de las tareas previas
- Smoke suite verde es la "puerta" para Demo Day

## Context

- Plan AI-DLC: Step 17 del plan U1
- NFR §6.2 coverage requirements
- PBT extension activa per Q2 inception
- Smoke suite agregada en commit 8699fac (10 casos cubriendo todos los path críticos)

## Definition of ready

- [x] Todo el código implementado (tasks 001-010)
- [x] App.ts permite inject() para integration
- [x] Fixtures con datos curados
