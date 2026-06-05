---
id: 004-infrastructure-plugins
title: "Plugins Fastify infra: postgres, error-handler, request-context, security"
milestone: m2-infrastructure
priority: high
estimation: M
blockedBy: ["003-config-and-repos"]
blocks: ["008-api-layer-and-jobs"]
status: done
closed_by_commit: 5628ea9
---

## Summary

5 plugins Fastify que decoran la instancia con capacidades transversales: pool de Postgres, cliente Bedrock (comentado para Demo Day per workaround #4), error handler global que mapea HermesError → HTTP (con logging para diagnóstico), request-context que inyecta correlation_id por request, y security con helmet + CORS + rate-limit con storage en Postgres.

## Scope (deliverables)

- `hermes/src/plugins/postgres.plugin.ts` — fastify.pg pool decoration con pg.Pool (CJS/ESM import fix)
- `hermes/src/plugins/bedrock.plugin.ts` — fastify.bedrock client (comentado en app.ts por incompat de versión SDK)
- `hermes/src/plugins/error-handler.plugin.ts` — CC-2 con mapping HermesError → HTTP + request.log.error
- `hermes/src/plugins/request-context.plugin.ts` — CC-3 correlation_id por request
- `hermes/src/plugins/security.plugin.ts` — helmet + CORS (ALLOWED_ORIGINS=*) + rate-limit + crossOriginResourcePolicy: 'cross-origin' (para que SFCC pueda cargar el bundle)

## Acceptance criteria

- [x] app.pg accesible desde controllers después de register
- [x] HermesError lanzado en cualquier step → response HTTP con shape estándar { status, code, message }
- [x] Errores no-Hermes responden 500 INTERNAL_ERROR genérico (sin filtrar info sensible)
- [x] CORP header permite que widget.js sea cargado cross-origin (SFCC sandbox → Hermes tunnel)
- [x] Rate limit dispara 429 con mensaje cuando excede

## Test plan

- Manual: POST /chat con payload inválido → 4xx con código mapeado
- Manual: lanzar 200 requests/min desde misma IP → 429 después de RATE_LIMIT_IP_MAX
- Integration: chat.test.ts y health.test.ts (task 011) confirman wiring

## Context

- Plan AI-DLC: Step 7 del plan U1
- NFR patterns §4.2, §4.4, §4.5, §4.6: error handling + correlation + security
- Bug #12 (CORP same-origin → cross-origin): commit `8699fac`

## Definition of ready

- [x] Repositorios listos (task 003)
- [x] Models de error definidos (task 002)
- [x] Decisión Plan B Demo Day: SFCC_MODE=mock y Bedrock comentado
