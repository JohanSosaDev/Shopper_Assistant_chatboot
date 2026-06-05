---
id: 009-composition-root-entrypoints
title: "Composition root + entrypoints (app, server, migrate, seed)"
milestone: m4-api-and-widget
priority: high
estimation: S
blockedBy: ["008-api-layer-and-jobs"]
blocks: ["011-tests-suite", "012-documentation-and-deployment"]
status: done
closed_by_commit: 5628ea9
---

## Summary

CC-1 composition root en app.ts: construye Fastify instance, registra plugins infra (postgres + error-handler + request-context + security), construye repositories + services + sfcc client + tool registry + conversation service, registra plugins de feature (m1/m3/m4/m6/m7/m8), registra widget static routes, registra jobs. server.ts es el entry point: carga env, build app, listen, graceful shutdown SIGTERM. migrate.ts ejecuta postgres-migrations contra DATABASE_URL. seed.ts updatea brand_config Patprimo con prompts reales + carga demo orders count.

## Scope (deliverables)

- `hermes/src/app.ts` — buildApp() que wira todo (CC-1)
- `hermes/src/server.ts` — entry point con SIGTERM graceful shutdown
- `hermes/src/migrate.ts` — runner de postgres-migrations
- `hermes/src/seed.ts` — seed Patprimo brand config + verify fixtures

## Acceptance criteria

- [x] `npm run dev` arranca server en :3000 sin errores
- [x] `npm run migrate` ejecuta las 5 migrations en orden + tracking en tabla `migrations`
- [x] `npm run seed` updatea brand_configs.patprimo con prompts reales (no placeholder)
- [x] SIGTERM dispara graceful shutdown (close server + close pool)
- [x] Composition order respeta dependencias (postgres antes que services, services antes que plugins de feature)

## Test plan

- Manual: `npm run dev` con .env válido → ver "Hermes listening on port 3000"
- Manual: kill -SIGTERM <pid> → ver "Closing connections" + exit 0
- Integration: app.inject() en tests usa buildApp directamente

## Context

- Plan AI-DLC: Step 15 del plan U1
- CC-1 composition root: `application-design/`
- Graceful shutdown NFR §5.3

## Definition of ready

- [x] Todos los services + plugins + jobs listos (tasks 004, 006, 007, 008)
- [x] Migrations y seed scripts diseñados
