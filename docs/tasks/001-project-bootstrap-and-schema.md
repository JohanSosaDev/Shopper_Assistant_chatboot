---
id: 001-project-bootstrap-and-schema
title: "Bootstrap del proyecto + esquema de datos Postgres"
milestone: m1-foundation
priority: high
estimation: M
blockedBy: []
blocks: ["002-domain-models-and-libs", "003-config-and-repos"]
status: done
closed_by_commit: 5628ea9
---

## Summary

Setup inicial del workspace `hermes/`: package.json con dependencies, tsconfig strict, .env.example, lint+format, server placeholder con /health. Además: 5 migrations SQL forward-only que crean el esquema completo del MVP (8 ENUMs + 9 tablas + 11 indexes + constraints), extensions pgcrypto + pgvector, y roles Postgres separados por responsabilidad (hermes_app, hermes_retention).

## Scope (deliverables)

- `hermes/package.json` con TypeScript + Fastify 4 + Postgres + Bedrock SDK + Vitest + esbuild
- `hermes/tsconfig.json` strict + noUncheckedIndexedAccess + noUnusedLocals
- `hermes/.gitignore`, `.env.example`, `.eslintrc.json`, `.prettierrc`, `.editorconfig`
- `hermes/src/app.ts`, `hermes/src/server.ts` (placeholders funcionales con /health)
- `hermes/migrations/0001-init.sql` — 8 ENUMs + 5 tablas core
- `hermes/migrations/0002-consent-log.sql` — append-only consent_log con REVOKE UPDATE/DELETE
- `hermes/migrations/0003-brand-config-seed.sql` — brand_configs con bootstrap Patprimo
- `hermes/migrations/0004-turn-log-audit.sql` — pii_token_map + turn_log_audit
- `hermes/migrations/0005-indexes.sql` — 11 indexes performance
- `hermes/docker-init/00-create-root-role.sh` + `01-extensions-and-roles.sh` (wrappers psql con env vars)

## Acceptance criteria

- [x] `tsc --noEmit` exit 0 en strict mode
- [x] Postgres docker-compose levanta limpio, ejecuta init scripts sin errores de sintaxis
- [x] 5 migrations corren idempotentes, dejan el esquema esperado
- [x] Constraints CHECK enforcen invariantes de domain-entities.md (R-* rules)
- [x] Roles hermes_app y hermes_retention con permisos diferenciados

## Test plan

- Manual: `docker compose up -d postgres-pgvector` y verificar logs sin errores
- Manual: conectar con psql y verificar tablas + ENUMs + indexes
- Automatizado (M5): `npm run migrate` + smoke suite que toca el esquema

## Context

- Plan AI-DLC original: Steps 1 + 2 en `ai-dlc/aidlc-docs/construction/plans/unit1-core-agente-code-generation-plan.md`
- Domain entities: `ai-dlc/aidlc-docs/construction/unit1-core-agente/functional-design/domain-entities.md`
- NFR security baseline (SECURITY-06/13/14): `ai-dlc/aidlc-docs/construction/unit1-core-agente/nfr-requirements/`
- Docker infra: `ai-dlc/aidlc-docs/construction/unit1-core-agente/nfr-design/logical-components.md`

## Definition of ready

- [x] PRD y application-design aprobados (E4-E5)
- [x] Decisión stack confirmada: TypeScript + Fastify + Postgres+pgvector
- [x] Decisión deployment: local-only Docker Compose para MVP

## Notes

Bugs encontrados durante implementación (todos cerrados en commit ac396fd):
- docker-init usaba sintaxis psql var `:'VAR'` que no se interpola → convertido a `.sh` wrappers
- Migration 0005 tenía `NOW()` en index predicate (no IMMUTABLE) → quitado predicate
