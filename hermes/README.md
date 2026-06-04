# Hermes

Backend del agente conversacional de IA para atención al cliente sobre Salesforce Commerce Cloud (SFCC) de PASH SAS.

## Quick start

```bash
cp .env.example .env       # configurar secrets (rellena los CHANGE_ME)
npm install                # instalar deps locales (lint/test/typecheck)
npm run up                 # docker compose up -d (build + start hermes + postgres)
npm run migrate            # aplica migrations SQL 0001..N
npm run seed               # carga Patprimo brand config + sample data
npm run logs               # tail de la app
```

Smoke test rápido:

```bash
curl http://localhost:3000/health/ready    # debe retornar 200
```

## Estructura

```
hermes/
├── src/                       Backend TypeScript
│   ├── app.ts                 Composition root (CC-1)
│   ├── server.ts              Entry point con graceful shutdown
│   ├── config/                Zod env schema, constants
│   ├── plugins/               Fastify plugins (m1..m8 + infra)
│   ├── controllers/           HTTP routes
│   ├── services/              Business logic
│   ├── repositories/          DB access (pg crudo)
│   ├── models/                Zod schemas + branded types
│   ├── tools/                 SFCC integrations
│   ├── prompts/               Patprimo system prompt + few-shot
│   ├── guardrails/            Input + output guards
│   ├── lib/                   retry, circuit-breaker, anonymizer, hashing
│   └── jobs/                  node-cron background jobs
│
├── widget/                    Frontend vanilla TS bundle (≤30kb gzipped)
│   ├── src/                   Source TS + CSS + i18n
│   ├── public/                Built widget.js + widget.css
│   └── esbuild.config.mjs
│
├── migrations/                SQL forward-only migrations
├── tests/                     Vitest + fast-check + Supertest
├── fixtures/                  Mock data (demo-orders.json, etc.)
├── scripts/                   create-bm, backup, smoke tests
└── docker-compose.yml         hermes + postgres-pgvector + mailhog
```

## Documentación canónica

Toda la documentación operativa vive en la raíz del repo (un nivel arriba):

- [`../README.md`](../README.md) — entrada general del proyecto
- [`../PRODUCT.md`](../PRODUCT.md) — voz, usuarios, anti-referencias
- [`../DESIGN.md`](../DESIGN.md) — sistema visual con tokens multi-marca
- [`../STACK.md`](../STACK.md) — arnés Claude Code + modelos + stack auxiliar
- [`../AGENTS.md`](../AGENTS.md) — convenciones del repo y comandos
- [`../VALIDATION.md`](../VALIDATION.md) — comandos de verificación detallados

Specs por unidad en `../ai-dlc/aidlc-docs/construction/unit{1,2,3}/`.

## API

| Endpoint | Método | Descripción |
|---|---|---|
| `/health` | GET | Alive check |
| `/health/ready` | GET | Readiness (consulta DB) |
| `/chat` | POST | Enviar mensaje |
| `/widget/config?brand=` | GET | Config del widget (textos, colores) |
| `/widget/widget.js` | GET | Bundle JS del widget |
| `/widget/widget.css` | GET | CSS del widget |

### POST /chat

```json
{
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "brand": "patprimo",
  "message": "¿Cuál es el estado de mi pedido PP-2024-123456?"
}
```

Respuesta:

```json
{
  "turn_id": "550e8400-e29b-41d4-a716-446655440001",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Su pedido PP-2024-123456 está en bodega listo para despachar.",
  "early_exit_reason": null,
  "latency_ms": 843,
  "handoff_triggered": false
}
```

## Testing

```bash
npm test                        # Unit tests + PBT (52 tests, ~4s)
npm run test:coverage           # Con cobertura (target ≥70% lines)
npm run test:integration        # Integración con Postgres real
npm run test:pbt                # Property-based tests (fast-check)
npm run typecheck               # tsc --noEmit (strict mode)
npm run lint                    # ESLint + Prettier
```

## Architecture

Pipeline de 10+1 steps secuenciales con early-exit. Ver [`docs/architecture.md`](docs/architecture.md) para el detalle del request flow.

```
Input → Guardrails → Identity → Consent → Brand Config → Intent → Tools → Generate → Output Guards → Persist → Log
```

## Status

Code Generation Plan Unit 1 ejecutado 2026-06-02. Ver plan en `../ai-dlc/aidlc-docs/construction/plans/unit1-core-agente-code-generation-plan.md`.
