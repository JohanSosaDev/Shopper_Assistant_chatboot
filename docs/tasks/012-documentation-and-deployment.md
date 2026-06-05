---
id: 012-documentation-and-deployment
title: "Documentación operativa + artefactos deployment + one-command launcher"
milestone: m5-qa-and-deploy
priority: med
estimation: M
blockedBy: ["009-composition-root-entrypoints"]
blocks: []
status: done
closed_by_commit: 1ebd85a
---

## Summary

Documentación operativa para que cualquiera (incluido el evaluador del Demo Day) pueda levantar Hermes sin friction: README con quick start, architecture.md con request flow, demo-day-runbook con receta para el día del demo. Plus deployment artifacts: Dockerfile multistage (build → prod), docker-compose.yml con 3 servicios (postgres+pgvector, mailhog, hermes), docker-init scripts que setup roles + extensions. Y la corona del show: `npm run demo` — script Node que verifica Docker, levanta stack, espera healthy, lanza Cloudflare Tunnel, imprime summary con URL pública + pedidos demo + ejemplos curl. Cleanup graceful con Ctrl+C.

## Scope (deliverables)

Documentación:
- `hermes/README.md` — quick start + estructura + endpoints + testing
- `hermes/docs/architecture.md` — request flow diagram
- `docs/demo-day-runbook.md` — receta paso a paso Demo Day con .env example
- `aidlc-docs/construction/unit1-core-agente/code/` — markdown summaries del code gen

Deployment:
- `hermes/Dockerfile` — multistage build (node:20-alpine) + healthcheck
- `hermes/docker-compose.yml` — 3 servicios + healthchecks + depends_on
- `hermes/docker-init/00-create-root-role.sh` + `01-extensions-and-roles.sh`
- `hermes/.dockerignore` — `**/node_modules` + dist + etc.

Launcher:
- `hermes/scripts/demo.mjs` — one-command launcher (verifica + sube stack + tunnel + summary + Ctrl+C cleanup)
- `hermes/scripts/demo-stop.mjs` — cleanup explícito si demo se cae feo
- `hermes/package.json` scripts: `demo`, `demo:stop`, `smoke:suite`

## Acceptance criteria

- [x] `npm run demo` arranca cold-start completo en ~30-60s
- [x] Summary imprime URL del tunnel + pedidos demo + ejemplos curl
- [x] Ctrl+C cierra cloudflared + tira docker compose limpio
- [x] `npm run demo:stop` mata cloudflared + docker compose down
- [x] README.md tiene quick start ejecutable
- [x] demo-day-runbook.md tiene .env template + comandos para el día

## Test plan

- Manual: clean state → `npm run demo` → debe llegar a "HERMES DEMO LISTO" en <90s
- Manual: smoke caso 1 vía curl con URL del tunnel
- Manual: Ctrl+C debe cerrar todo limpio (verificar `docker compose ps` después)

## Context

- Plan AI-DLC: Steps 18 + 19 del plan U1
- demo-day-runbook: agregado en commit que incluye Demo Day Plan B
- Launcher: agregado en commit 1ebd85a como mejora operativa
- Build & Test docs en `aidlc-docs/construction/build-and-test/`

## Definition of ready

- [x] App + jobs + entrypoints listos (task 009)
- [x] Decisión deployment: Docker Compose local-only para MVP
- [x] Plan B Demo Day: video pre-grabado + SFCC_MODE=mock
