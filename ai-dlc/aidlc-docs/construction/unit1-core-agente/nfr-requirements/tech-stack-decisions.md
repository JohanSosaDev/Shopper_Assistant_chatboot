# Tech Stack Decisions — Unit 1: Core Agente

> Confirma decisiones tomadas + cierra Open Decisions pendientes.

---

## 1. Stack confirmado (de Inception + NFR Unit 1)

| Capa | Tecnología | Versión / config | Origen |
|---|---|---|---|
| Lenguaje | TypeScript | latest 5.x strict | ADR-1 |
| Runtime | Node.js | 20 LTS | requirements.md §7 |
| Web framework | Fastify | 4.x | ADR-1 |
| Type provider | `fastify-type-provider-zod` | 1.x | ADR-5 |
| Validación | Zod | 3.x | ADR-5 |
| DI | `fastify.decorate` nativo | — | ADR-2 |
| LLM SDK | `@anthropic-ai/bedrock-sdk` | latest | ADR-4 |
| LLM modelo | Claude Haiku 4.5 | via Bedrock LATAM | PRD |
| HTTP client (SFCC) | `undici` | nativo Node 20 | (default) |
| DB | PostgreSQL | 16 (alpine) | Q5 Requirements |
| Vector ext | pgvector | 0.7.x | PRD §M2 |
| DB driver | `pg` | 8.x | ADR-3 |
| Logger | `pino` | 9.x | NFR §3 |
| Security headers | `@fastify/helmet` | 11.x | SECURITY-04 |
| Rate limiting | `@fastify/rate-limit` | 9.x | R-RATE-2 |
| CORS | `@fastify/cors` | 9.x | SECURITY-08 |
| Compression | `@fastify/compress` | 7.x | (opcional) |
| Container | Docker + Docker Compose | latest stable | Q7 Requirements |

---

## 2. Open Decisions cerradas en este stage

### OD-2 — Migrations tool (resuelto: `postgres-migrations`)

**Decisión**: `postgres-migrations` (no `node-pg-migrate`).

**Razonamiento** (Q3=B en NFR plan):
- ~5–6 migrations totales en MVP (init schema, consent_log, brand_seed, turn_log_audit, indexes).
- SQL puro + tracker simple en `schema_migrations` table.
- Menos surface area que `node-pg-migrate`; menos onboarding.
- Up-only migrations (no rollback) aceptable en MVP — si falla una migration, se rolls forward con una nueva.

**Workflow**:
```text
hermes/migrations/
├── 0001-init.sql
├── 0002-consent-log.sql
├── 0003-brand-config-seed.sql
├── 0004-turn-log-audit.sql
└── 0005-indexes.sql

hermes/src/migrate.ts   # script que invoca postgres-migrations
```

Comando: `npm run migrate` ejecuta `postgres-migrations` apuntando a `migrations/` con env vars de conexión.

### OD-6 — Tests stack (resuelto: Vitest + Supertest, sin Playwright)

**Decisión**: **Vitest** (unit + integration) + **Supertest** (HTTP integration). **Sin Playwright en MVP**.

**Razonamiento** (Q4=B en NFR plan):
- Vitest ~10× más rápido que Jest, native TS sin transpilación adicional, mismo API.
- Supertest indispensable para validar endpoints de Fastify contra request reales.
- Playwright e2e widget = +1–2 días setup + tests adicionales; el demo manual lo cubre suficiente.
- Coverage target: **70% lines** en código de negocio (`services/`, `lib/`, `tools/`, `guardrails/`). Sin requirement de branches.

**Stack añadido al package.json**:
```json
{
  "devDependencies": {
    "vitest": "^2.x",
    "@vitest/coverage-v8": "^2.x",
    "supertest": "^7.x",
    "@types/supertest": "^6.x"
  }
}
```

**PBT (Property-Based Testing) extension activa**: `fast-check` para los pattern matchers (anonymizer, guardrails) y rate limiter. Aplica obligatoriamente en:
- `anonymizePII` round-trip
- Tool validators
- Guardrail pattern matchers
- Rate limiter concurrency

---

## 3. Open Decisions todavía pendientes

| OD | Tema | Próximo stage donde se cierra |
|---|---|---|
| OD-5 | Frontend widget approach | Ya cerrado en FD Unit 1 (Vanilla JS bundle) ✅ |
| OD-7 | A/B Oct8ne strategy | Functional Design Unit 3 |
| OD-8 | CI/CD pipeline detalle | Build and Test |

**Actualizar `application-design.md`** y `aidlc-state.md` con estos cierres.

---

## 4. Versionado y supply chain (SECURITY-10)

### 4.1 Pinning policy
- `package-lock.json` committed (mandatory).
- Dependencies pinneadas a versiones exactas en `package.json` (no `^` ni `~` para deps de runtime; permitido `^` en devDependencies).
- Docker base images con versión específica (no `:latest`):
  - `node:20.18-alpine`
  - `postgres:16-alpine` (oficial Docker Hub)

### 4.2 Vulnerability scanning
- `npm audit` corre en CI; falla build si vulnerability `high` o `critical`.
- Alternative: GitHub Dependabot habilitado en el repo (auto-PRs para bumps).

### 4.3 SBOM
- Out-of-scope MVP. Aplica en Fase 2 si compliance lo exige.

---

## 5. Configuration management

### 5.1 Environment variables
Definidas en `hermes/src/config/env.ts` con Zod schema validation al startup:

```ts
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  BEDROCK_REGION: z.string().default("us-east-1"), // pendiente confirmar LATAM region exact
  BEDROCK_MODEL_ID: z.string().default("anthropic.claude-haiku-4-5:0"),
  SFCC_BASE_URL: z.string().url(),
  SFCC_CLIENT_ID: z.string(),
  SFCC_CLIENT_SECRET: z.string(),
  PII_SALT: z.string().min(32),
  ALLOWED_ORIGINS: z.string(), // comma-separated
  RATE_LIMIT_IP_MAX: z.coerce.number().default(30),
  RATE_LIMIT_CONV_MAX: z.coerce.number().default(10),
});
```

### 5.2 Secrets handling
- `.env` en `.gitignore` (NO committed).
- `.env.example` committed con keys vacíos y comentarios.
- En MVP local: secrets en `.env` local solamente.
- En Fase 2: AWS Secrets Manager o Parameter Store.

---

## 6. Build + bundle

### 6.1 Backend
- TypeScript → JavaScript via `tsc` (no bundler para backend; Node carga directo).
- Output a `hermes/dist/`.
- Container Docker hace `RUN npm ci && npm run build`.

### 6.2 Frontend widget
- Bundler: **esbuild** (no webpack, no rollup) — ~30 LOC config + builds en <1s.
- Output: `hermes/widget/public/widget.js` + `widget.css`.
- Sirve desde Hermes Fastify en endpoint `/widget/widget.js` (Fase 2: CDN dedicada).

### 6.3 Container
```dockerfile
# Backend
FROM node:20.18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20.18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## 7. Decision log (resumen tabular)

| # | Decisión | Valor | Razonamiento corto |
|---|---|---|---|
| TD-1 | Migrations tool | `postgres-migrations` | OD-2 cerrada; SQL puro suficiente para 5-6 migrations |
| TD-2 | Test framework | Vitest | OD-6 parcial; 10× más rápido que Jest |
| TD-3 | HTTP integration tests | Supertest | OD-6; estándar Fastify ecosystem |
| TD-4 | E2E tests | **None en MVP** | Demo manual basta; OD-6; defer Playwright a Fase 2 |
| TD-5 | Coverage target | 70% lines (sin branches) | NFR-Unit-1 §6.2; realista para 2 semanas restantes |
| TD-6 | Frontend bundler | esbuild | Más simple que webpack para widget ~30kb |
| TD-7 | HTTP client externo | undici (Node 20 native) | Performante, sin deps extra |
| TD-8 | Logger | pino + stdout JSON | NFR-Unit-1 §5.3; performance excelente |
| TD-9 | Rate limit storage | Postgres (no Redis) | MVP simplicity; latency aceptable a 50 conv |
| TD-10 | Secrets en MVP | `.env` local | Fase 2 → AWS Secrets Manager |

---

## 8. Security Compliance Summary (stage = NFR Requirements)

| Rule | Status | Notas |
|---|---|---|
| SECURITY-10 (supply chain) | Aplicado | §4 pinning + audit + Dependabot |
| SECURITY-12 (credentials) | Aplicado parcial | §5.2 no hardcoded; MVP usa .env local |
| Otros | Documentados en `nfr-requirements.md` §4 | — |

*No hay findings bloqueantes en este stage.*
