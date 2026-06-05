---
id: 003-config-and-repos
title: "Config env Zod + repositories Postgres"
milestone: m1-foundation
priority: high
estimation: S
blockedBy: ["002-domain-models-and-libs"]
blocks: ["004-infrastructure-plugins", "006-prompts-guardrails-services"]
status: done
closed_by_commit: 5628ea9
---

## Summary

Validación fail-fast de variables de entorno con Zod al startup (SECURITY-09, NFR §4.3) — si una variable crítica falta o tiene formato inválido, el proceso aborta antes de aceptar requests. Plus 5 repositories Postgres usando pg pool con queries SQL directas (sin ORM): conversations (CRUD + close stale), consent_log (append-only + getLatest), turn_log_audit (INSERT only), brand_configs (SELECT seed), rate_limit_buckets (increment + check).

## Scope (deliverables)

- `hermes/src/config/env.ts` — Zod schema con todas las env vars + SFCC_MODE switchable + PII_SALT minLength 32
- `hermes/src/repositories/conversation.repo.ts` — CRUD + ensureExists UPSERT + insertTurn + closeStale + getTurns
- `hermes/src/repositories/consent.repo.ts` — insert + hasGranted + getLatest
- `hermes/src/repositories/turn-log.repo.ts` — insert + insertPiiTokenMap
- `hermes/src/repositories/brand-config.repo.ts` — getActive (SELECT) — solo read en Unit 1
- `hermes/src/repositories/rate-limit.repo.ts` — increment + checkLimit

## Acceptance criteria

- [x] Startup falla con error claro si falta DATABASE_URL, PII_SALT, etc.
- [x] PII_SALT < 32 chars rechazado por Zod
- [x] conversation.create devuelve row con conversation_id generado
- [x] consent.insert dispara error si conversation_id no existe (FK)
- [x] turn-log.insert respeta append-only (no UPDATE permitido por GRANT)

## Test plan

- Manual: probar con .env vacío o con var inválida — verificar fail-fast
- Integration: ensureExists + insertTurn en orden, verificar FK linkage
- Smoke suite (task 011) toca todos los repos indirectamente

## Context

- Plan AI-DLC: Steps 5 + 6 del plan U1
- NFR §4.3 fail-fast on config: `ai-dlc/aidlc-docs/construction/unit1-core-agente/nfr-design/nfr-design-patterns.md`
- SECURITY-09 env validation: NFR-R
- Plan B SFCC: `SFCC_MODE` switchable confirmado en env.ts

## Definition of ready

- [x] Modelos definidos (task 002)
- [x] Schema Postgres listo (task 001)
- [x] Decisión: no ORM, queries SQL directas con pg pool
