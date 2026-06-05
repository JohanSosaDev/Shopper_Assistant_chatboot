---
id: 008-api-layer-and-jobs
title: "Capa HTTP (controllers + feature plugins) + background jobs"
milestone: m4-api-and-widget
priority: high
estimation: M
blockedBy: ["004-infrastructure-plugins", "007-pipeline-orchestrator"]
blocks: ["009-composition-root-entrypoints"]
status: done
closed_by_commit: 5628ea9
---

## Summary

4 controllers HTTP: chat (POST /chat — el endpoint estrella), health (GET /health + /health/ready), widget-config (GET /widget/config?brand=X), widget-static (serve widget.js + .css + test.html). Plus 6 plugins de feature que registran cada controller en Fastify (m1, m3, m4, m6, m7, m8 mapeados de los módulos AI-DLC). Y 3 background jobs con node-cron: session-cleanup (cada 30 min cierra conversations stale R-SESS-2), retention (daily purga turn_log_audit > 90d con rol hermes_retention), job-runner que los registra al startup.

## Scope (deliverables)

Controllers (`hermes/src/controllers/`):
- `chat.controller.ts` — POST /chat con Zod validation + invoca conversationService.handleTurn
- `health.controller.ts` — GET /health (alive) + /health/ready (con SELECT 1 a DB)
- `widget-config.controller.ts` — GET /widget/config?brand=X devuelve config persona
- `widget-static.controller.ts` — @fastify/static prefix /widget/ (registrado en app.ts, fix bug #9)

Feature plugins (`hermes/src/plugins/`):
- `m1-conversation.plugin.ts` — chat controller
- `m3-sfcc.plugin.ts` — tool registry
- `m4-session.plugin.ts` — session service
- `m6-compliance.plugin.ts` — compliance service
- `m7-observability.plugin.ts` — logger service
- `m8-brand-config.plugin.ts` — brand config service

Jobs (`hermes/src/jobs/`):
- `session-cleanup.job.ts` — schedule */30 min, closeStale conversations
- `retention.job.ts` — schedule 0 3 * * *, purga retention con rol diferenciado
- `job-runner.ts` — registra ambos jobs al startup de la app

## Acceptance criteria

- [x] POST /chat con payload válido → 200 con ChatResponse shape
- [x] POST /chat con payload inválido → 400 ValidationError
- [x] GET /health → 200 status:ok sin tocar DB
- [x] GET /health/ready → 200 si DB OK, 503 si DB falla
- [x] GET /widget/config?brand=patprimo → JSON con customerFacingName "Sofía de Patprimo"
- [x] GET /widget/widget.js → 200 (fix bug #9: widget-static.controller registrado)
- [x] Jobs aparecen en logs al startup ("Job registered ...")

## Test plan

- Integration: tests/integration/chat.test.ts (supertest)
- Integration: tests/integration/health.test.ts
- Manual: probar 4 endpoints con curl

## Context

- Plan AI-DLC: Steps 13 + 14 del plan U1
- HTTP API: `application-design/`
- Bugs corregidos:
  - #9 widget-static.controller no registrado en app.ts
  - #10 @fastify/static@9.x incompatible Fastify 4 → downgrade ^7.0.4

## Definition of ready

- [x] Plugins infra listos (task 004)
- [x] Pipeline orchestrator funcional (task 007)
- [x] Services M4/M6/M7/M8 listos (task 006)
