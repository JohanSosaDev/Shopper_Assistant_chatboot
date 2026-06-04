# STACK.md — Hermes

Ficha del arnés de desarrollo y modelos usados por Hermes. Este archivo dice qué herramientas se usan para construir el chatbot, con qué modelos opera el producto en runtime, y por qué se eligió cada pieza.

Lee esto si: vas a hacer Code Generation, vas a estimar costos operativos, vas a coordinar con IT PASH sobre acceso a Bedrock o SFCC, o eres un agente nuevo entrando al repo.

## Vista de pájaro

```
┌─────────────────────────────────────────────────────────┐
│  Desarrollo (laptop Johan @ PASH SAS)                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Claude Code v2.x  +  skills user-level (19)     │   │
│  │  Modelo del agente: Claude Sonnet 4.5 / Opus 4.7 │   │
│  │  Hooks: PostToolUse (lint), permissions strict   │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓ genera                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Backend Hermes (Node 20 + TypeScript + Fastify) │   │
│  │  Postgres 16 + pgvector (Docker Compose)         │   │
│  │  Bundle widget vanilla TS ≤30kb gzipped          │   │
│  │  Brand Manager UI: EJS server-rendered           │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓ invoca en runtime           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  AWS Bedrock sa-east-1 (LATAM)                   │   │
│  │  Modelo del producto: Claude Haiku 4.5           │   │
│  │  Tool calling: get_order_status (+ Fase 2)       │   │
│  │  Fallback region: us-east-1                      │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓ consulta                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  SFCC OCAPI/SCAPI (sandbox PASH cloud)           │   │
│  │  Cloudflare Tunnel expone localhost:3000         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## A. Arnés de desarrollo

### Claude Code v2.x

**Por qué este arnés**:
- Soporta nativo `~/.claude/skills/` user-level (19 skills instaladas).
- Hooks deterministas para validación pre/post edit.
- `.claude/settings.local.json` versionado para configuración por-proyecto.
- Subagentes (Plan, Explore, custom) para paralelismo controlado.
- MCP support para extensibilidad futura.

**Por qué no las alternativas**:

| Herramienta | Por qué descartada |
|---|---|
| Codex CLI | Windows nativo no soportado (requiere WSL2; setup adicional) |
| OpenHands | Servidor local pesado, foco en orquestación >1 agente (overkill MVP) |
| Cursor | Editor-céntrico, no terminal-first; menos integración con AI-DLC workflows |
| Antigravity | Buen para paralelismo visual, pero adds complexity sin Pay-off para MVP solo-developer |

**Configuración mínima** (`.claude/` en el repo + `~/.claude/` user):
- `.claude/settings.local.json`: permisos del proyecto, env vars locales.
- `.claude/hooks/`: hooks Bash/PowerShell para lint/format post-edit.
- `.claude/skills/` (project-level, vacío por ahora) + `~/.claude/skills/` (19 skills user-level).
- Skills instaladas: ver [project_skills_installed](memory/project_skills_installed.md).

## B. Modelo del agente (escribe el código)

**Modelo recomendado durante Code Generation**: **Claude Sonnet 4.5** (o **Opus 4.7** para decisiones de arquitectura críticas).

| Característica | Valor | Por qué importa |
|---|---|---|
| Context window | 200K tokens | Suficiente para cargar todos los AI-DLC docs de una Unit + skills + memorias |
| Tool calling | Nativo | Read/Edit/Write/Bash/Grep sin friction |
| Cache tokens | Sí (5 min TTL) | Reduce costo cuando una sesión hace muchas iteraciones sobre el mismo contexto |
| Computer use / multimodal | Soportado | Útil cuando necesitemos analizar mockups o screenshots de SFCC |
| Latencia p50 | ~3-8s por turno | Aceptable para CG iterativo con human-in-the-loop |

**Estimación de costo CG completo**:
- 3 unidades × ~3 stages CG cada una × ~50K tokens input + 10K output por stage ≈ ~600K tokens total.
- Sonnet 4.5: ~$5-7 USD total CG. Opus 4.7: ~$25-30 USD.
- Recomendación: Sonnet 4.5 default, escalar a Opus para refactor de NFR Design Unit 3 si aplica.

## C. Modelo del producto (conversa con clientes)

**Modelo en runtime**: **Claude Haiku 4.5** via AWS Bedrock.

### Por qué Haiku 4.5

- **Latencia**: p50 <30s en Caso 1 estado de pedido (NFR Unit 1 SLO). Haiku da <8s p50 típicamente; budget acomodado para tool call SFCC.
- **Costo**: ~5x más barato que Sonnet. Crítico cuando proyectamos 1000+ turnos/día en producción Fase 2.
- **Tool calling**: soporta `get_order_status` con confiabilidad >95% en benchmarks Bedrock.
- **Multilingüe ES-CO**: calidad probada en español de Colombia (resultados del red team interno PASH).

### Región Bedrock

**Primary**: `sa-east-1` (São Paulo). Razones:
- Latencia <100ms desde Bogotá (vs ~150ms a `us-east-1`).
- Compliance: datos del cliente PASH no cruzan a US (Ley 1581 de Colombia, retención regional).
- Haiku 4.5 disponible.

**Fallback**: `us-east-1`. Activable vía env var `BEDROCK_REGION` si `sa-east-1` está degradada (R-ERR-3 alerta a Operador si Bedrock unreachable >1 min).

### Configuración invocación

```ts
{
  model: "anthropic.claude-haiku-4-5:0",
  max_tokens: 2000,           // R-RATE-1 token cap per turn
  temperature: 0.3,           // bajo para grounding consistente
  system: "...",              // brand config system_prompt
  messages: [...],            // últimos N=10 turnos (R-SESS-3)
  tools: [getOrderStatusTool] // MVP solo este tool
}
```

### Costo estimado por turn

- Input avg: ~3000 tokens (system + few-shot + histórico + mensaje).
- Output avg: ~150 tokens (respuesta del bot).
- Costo por turn Haiku 4.5: ~$0.0005 USD.
- 1000 turnos/día = ~$15 USD/mes Bedrock. Muy manejable.

## D. Stack auxiliar

### Backend

| Componente | Versión | Por qué |
|---|---|---|
| Node | ≥20 LTS | LTS soportado, performance V8 reciente |
| TypeScript | 5.x strict | Tipado completo, evita ~30% de bugs comunes en runtime |
| Fastify | 4.x | Plugin pattern compatible con la arquitectura modular de Unit 1; menor overhead que Express |
| `pg` driver crudo | 8.x | Sin ORM por decisión (per Q3 NFR-R Unit 1). Queries explícitas, control fino de TX, sin magic |
| `pgvector` extension | Postgres 16 | Para Knowledge stub Unit 2 (Fase 2 RAG real) |
| `@anthropic-ai/bedrock-sdk` | última | Cliente oficial Anthropic para Bedrock |
| Zod | 3.x | Input validation (SECURITY-05); schemas compartidos con TS types |
| pino | última | Logging estructurado JSON (NFR §4 Observability) |
| `@fastify/rate-limit` | última | R-RATE-2 enforce |
| `@fastify/helmet` | última | SECURITY-04 headers |
| nodemailer | última | Handoff email via mailhog (dev) / SMTP (Fase 2) |

### Frontend

| Componente | Stack | Bundle target |
|---|---|---|
| Widget cliente | Vanilla TypeScript + plain CSS BEM | ≤30kb gzipped JS + ≤5kb CSS |
| BM UI | Server-rendered EJS templates + vanilla JS progressivo | No target (admin interno) |
| Dashboard operador | Server-rendered EJS + Chart.js opcional | No target |

**Sin web fonts custom** per [DESIGN.md](DESIGN.md). Stack `system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`.

### Testing

| Herramienta | Volumen MVP |
|---|---|
| Vitest | ~80-100 unit tests + bench |
| fast-check (PBT) | ~10 propiedades con 100 runs cada una |
| Supertest | ~20-30 integration tests sobre HTTP layer |
| docker-compose | Postgres + mailhog containers para integration |
| autocannon | Performance soft validation pre-Demo Day |

Sin Playwright, sin Cypress (OD-6, Fase 2).

### Local dev environment

- **Docker Compose** levanta 3 containers: `hermes`, `postgres-pgvector`, `mailhog`.
- **No CI/CD en MVP** (OD-8): tests local-only. Cada dev corre `npm test` pre-commit.
- **Cloudflare Tunnel** para exponer `localhost:3000` durante demo (ver [project_sfcc_integration_plan](memory/project_sfcc_integration_plan.md)).

## E. Restricciones operativas

### Hardware

- Laptop Johan @ PASH (Windows 11). Docker Desktop + WSL2 disponible.
- Sin máquina dedicada para tests pesados; performance benchmarks soft (autocannon) no formales.

### Acceso

| Servicio | Status | Bloquea Demo Day? |
|---|---|---|
| AWS Bedrock `sa-east-1` | Cuenta personal Johan ya verificada | No (verificable) |
| AWS Bedrock `us-east-1` fallback | Misma cuenta | No |
| SFCC OCAPI/SCAPI sandbox | Sandbox personal de Johan configurada | No (controlable) |
| SFCC producción | Sin acceso, sin scope MVP | No (Fase 2) |
| Cloudflare Tunnel | Tier free | No |
| GitHub | Repo personal | No |
| nodemailer SMTP corporate PASH | Sin acceso confirmado | No (mailhog cubre MVP) |

### Network

- Bedrock outbound HTTPS desde laptop. **Verificar antes de Demo Day**: `aws bedrock list-foundation-models --region sa-east-1` debe responder OK.
- SFCC outbound HTTPS desde laptop. **Verificar**: `curl https://<sandbox>.demandware.net/health` u OAuth endpoint.
- Cloudflare Tunnel: inbound desde browser de demo via `https://*.trycloudflare.com`.

### Costos proyectados Demo Day (1 hora demo + prep)

| Servicio | Costo estimado |
|---|---|
| AWS Bedrock Haiku 4.5 (50-100 turnos demo) | < $0.10 USD |
| Cloudflare Tunnel | $0 (free tier) |
| Docker resources | $0 (local) |
| **Total Demo Day** | **< $0.50 USD** |

### Costos proyectados CG completo (pre-Demo Day)

| Servicio | Costo estimado |
|---|---|
| Claude Code (Sonnet 4.5) durante CG 3 unidades | $5-7 USD |
| Bedrock testing (smoke + integration con Bedrock real opcional) | $1-2 USD |
| **Total CG** | **~$10 USD** |

## F. Decisiones documentadas (trazabilidad)

| Decisión | Fuente | Razón |
|---|---|---|
| Claude Code como arnés | Esta ficha | Soporta skills, hooks, AI-DLC; Windows nativo |
| Haiku 4.5 como modelo producto | NFR Design Unit 1 | Latencia + costo + LATAM compliance |
| `sa-east-1` Bedrock | NFR Unit 1 + deployment-architecture | Latencia desde Bogotá + Ley 1581 |
| Fastify vs Express | Q5 NFR-R Unit 1 | Plugin pattern + performance |
| `pg` crudo vs ORM | Q3 NFR-R Unit 1 | Control fino TX, sin magic, separation of duties con roles DB |
| pgvector single Postgres | Q5 Inception | Knowledge stub MVP + RAG Fase 2 sin nueva infra |
| Vanilla JS widget | Q5 FD Unit 1 | Bundle ≤30kb (TTI <500ms 4G) |
| EJS server-rendered BM UI | NFR Unit 2 | MVP-appropriate; sin bundler para admin |
| Local Docker Compose | Q7 Inception | MVP local-only; AWS hosting Fase 2 |
| Sin CI/CD pipeline | OD-8 | Tiempo a Demo Day > correctness automated gates |

## Fuentes de contexto

- [PRODUCT.md](PRODUCT.md) — voz y producto.
- [DESIGN.md](DESIGN.md) — sistema visual.
- [AGENTS.md](AGENTS.md) — convenciones cross-tool.
- [VALIDATION.md](VALIDATION.md) — comandos de verificación.
- `ai-dlc/aidlc-docs/aidlc-state.md` — estado actual del workflow AI-DLC.
- `ai-dlc/aidlc-docs/construction/unit1-core-agente/nfr-requirements/tech-stack-decisions.md` — decisiones formales de stack Unit 1.
- `ai-dlc/aidlc-docs/construction/build-and-test/build-and-test-summary.md` — detalle completo de testing.
- Memorias proyecto: [skills instaladas](memory/project_skills_installed.md), [Plan B Demo Day](memory/project_demo_day_plan_b.md), [Integración SFCC](memory/project_sfcc_integration_plan.md).
