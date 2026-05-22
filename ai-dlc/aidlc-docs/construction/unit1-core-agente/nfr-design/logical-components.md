# Logical Components — Unit 1: Core Agente

> **Scope**: componentes infra que existen en MVP + cómo se integran. Decisión Q4=A → solo app + Postgres. Cero cache externo, cero queue.

---

## 1. Infrastructure topology (MVP)

```mermaid
flowchart TB
    Client[Cliente web<br/>browser/mobile]
    SFCC_storefront[SFCC storefront<br/>patprimo.com.co]

    subgraph DockerCompose["Docker Compose (local-only MVP)"]
        App["Hermes app<br/>(Node 20 + Fastify)<br/>port 3000"]
        PG[("Postgres 16<br/>+ pgvector<br/>port 5432")]
    end

    subgraph External["External services"]
        Bedrock[(AWS Bedrock<br/>LATAM region<br/>Claude Haiku 4.5)]
        SFCC_API[(SFCC OCAPI/SCAPI<br/>orders, catalog)]
    end

    Client --> SFCC_storefront
    SFCC_storefront -->|widget.js loaded| Client
    Client -->|POST /chat<br/>GET /ab/decide<br/>GET /widget/config| App
    App <-->|SQL via pg driver| PG
    App -->|invoke LLM| Bedrock
    App -->|HTTP REST| SFCC_API

    style App fill:#4CAF50,color:#fff
    style PG fill:#9cf,color:#000
    style Bedrock fill:#FFB300,color:#000
    style SFCC_API fill:#FFB300,color:#000
```

**Solo 2 servicios en Docker Compose** (Q4=A). Externamente: Bedrock + SFCC.

---

## 2. Component inventory

### 2.1 Hermes app (Node process)

| Aspecto | Valor |
|---|---|
| Runtime | Node.js 20 LTS Alpine |
| Image | custom build via Dockerfile |
| Port | 3000 (HTTP) |
| Resources | mem 1G, cpus 1.0 |
| Restart policy | `unless-stopped` |
| Health check | `curl -f http://localhost:3000/health/ready` cada 30s |
| Env vars | inyectadas vía Docker Compose desde `.env` (gitignored) |
| Logs | stdout (Docker captura) en formato JSON pino |
| Volumes | ninguno persistente (state vive en Postgres) |

**Internal subcomponents** (todos en el mismo proceso):
- HTTP server (Fastify)
- Pipeline orchestrator (M1)
- Service singletons (decorated via `fastify.decorate`)
- pg pool (default size 10)
- Bedrock client (init lazy)
- Background jobs (`node-cron` in-process — session cleanup, retention)

### 2.2 Postgres + pgvector

| Aspecto | Valor |
|---|---|
| Image | `postgres:16-alpine` + `CREATE EXTENSION pgvector` en init |
| Port | 5432 (interno Docker network) |
| Resources | mem 1G, cpus 1.0 |
| Restart policy | `unless-stopped` |
| Health check | `pg_isready -U hermes_app` cada 30s |
| Persistence | volume `hermes_pg_data:/var/lib/postgresql/data` |
| Backup MVP | script externo `pg_dump` + cron del host → archivo local |
| Encryption at rest | aplica en Fase 2 con RDS; MVP local file-system |
| Connections | pool max 10 (default `pg`) |
| Statement timeout | 5s default |

**Schemas (Unit 1)**:
- `conversations`
- `turns`
- `consent_log` (append-only)
- `turn_log_audit` (append-only, retention 90d)
- `pii_token_map` (append-only)
- `brand_configs` (stub en Unit 1, full CRUD en Unit 2)
- `tool_call_records`
- `guardrail_events`
- `rate_limit_buckets` (para `@fastify/rate-limit` Postgres storage)
- `schema_migrations` (gestionado por `postgres-migrations`)

**Roles**:
- `hermes_app` — runtime app (INSERT-mostly, SELECT-mostly)
- `hermes_retention` — retention/forget jobs (DELETE-allowed sobre append-only)

### 2.3 No cache externo (Q2=A)
- **In-memory only**: brand config seed, breaker state, rate limit counters (en Postgres, no en memoria).
- **No Redis** en MVP.

### 2.4 No queue / scheduler externo (Q4=A)
- **Background jobs in-process** vía `node-cron`:
  - `session-cleanup` — cada 30 min
  - `retention` — daily (00:00 UTC)
- Si el proceso crashea, jobs no corren — aceptable MVP (Docker restart-on-failure rapidly recovers).

---

## 3. External dependencies

### 3.1 AWS Bedrock LATAM

| Aspecto | Valor |
|---|---|
| Region | LATAM (us-east-2 LATAM endpoint a confirmar exact) |
| Model | `anthropic.claude-haiku-4-5:0` |
| Auth | AWS IAM access key + secret (env vars) |
| Quota | TPM/RPM acorde a tier; coordinar antes de Fase 2 load |
| Networking | HTTPS outbound desde Docker (sin VPC peering en MVP) |
| Failure mode | fallback neutral + alerta (Unit 3) |

**Integration pattern**: SDK `@anthropic-ai/bedrock-sdk` — request/response síncrono. Sin streaming en MVP (latencia aceptable a 30s p50).

### 3.2 SFCC OCAPI / SCAPI

| Aspecto | Valor |
|---|---|
| Base URL | `https://<patprimo>.sfcc.com/...` (env var) |
| Auth | OAuth2 client credentials (env vars) |
| Endpoints usados (Unit 1) | `GET /orders/{order_id}` (OMS) |
| Networking | HTTPS outbound; el equipo SFCC debe abrir el cliente OAuth |
| Failure mode | retry → circuit breaker → fallback al cliente |

**Integration pattern**: `undici` HTTP client + token cache in-memory (token TTL ~30 min — refresh proactivo).

---

## 4. Cross-component integration patterns

### 4.1 App ↔ Postgres

- **Pool**: `pg.Pool({ max: 10 })`, conexión por query, release inmediato.
- **Migrations**: `npm run migrate` (script `postgres-migrations`) corre antes de `node dist/server.js` en el Dockerfile entrypoint.
- **Parameterized queries**: REGLA NO NEGOCIABLE — todas las queries usan `$1, $2`, nunca string concat. Enforcement vía lint rule (`@typescript-eslint/no-template-curly-in-string` para SQL strings + code review).

### 4.2 App ↔ Bedrock

- **Client init**: lazy en primer use, cached como singleton via `fastify.bedrock`.
- **Wrapped en** `withRetry` + `withCircuitBreaker` + `withTimeout` (todos del lib `hermes/src/lib/`).
- **Logging**: cada invocación loguea `model_id`, `tokens_in`, `tokens_out`, `latency_ms`, `stop_reason`.

### 4.3 App ↔ SFCC

- **Client**: `undici.Client` con keep-alive, pooled.
- **Token refresh job**: corre 5 min antes del expiry; mantenido in-memory.
- **Wrapped** en mismo retry/breaker/timeout.

### 4.4 App ↔ Client (HTTP)

- **Public endpoints**: `POST /chat`, `GET /ab/decide`, `GET /widget/config`, `GET /health`, `GET /widget/widget.js` (serving static).
- **Admin endpoints**: ninguno en Unit 1 (Unit 2+ los agregan).
- **CORS**: restricted a `ALLOWED_ORIGINS` env var.
- **Rate limit**: `@fastify/rate-limit` con storage Postgres.
- **Helmet**: aplicado globalmente.

---

## 5. Configuration matrix

| Config | Source | Override |
|---|---|---|
| `DATABASE_URL` | env var | obligatorio |
| `BEDROCK_REGION` | env var | default `us-east-2` (placeholder LATAM) |
| `BEDROCK_MODEL_ID` | env var | default `anthropic.claude-haiku-4-5:0` |
| `SFCC_BASE_URL`, `SFCC_CLIENT_ID`, `SFCC_CLIENT_SECRET` | env vars | obligatorios |
| `PII_SALT` | env var | obligatorio (min 32 chars) |
| `ALLOWED_ORIGINS` | env var comma-separated | obligatorio |
| `RATE_LIMIT_IP_MAX` | env var | default 30 |
| `RATE_LIMIT_CONV_MAX` | env var | default 10 |
| `LOG_LEVEL` | env var | default `info` |

---

## 6. Forward-looking pivots (NO se implementan en MVP)

Documentación de **qué cambiaría** si Fase 2 necesita escalar. Sirve de roadmap, no de scope.

| Necesidad futura | Pivot |
|---|---|
| Multi-instancia app horizontal | Rate limiter Postgres → Redis (shared state) + sticky sessions o stateless via JWT |
| Background jobs resilientes | `node-cron` in-process → BullMQ + Redis worker |
| Cache de brand config | In-memory module → Redis con TTL cuando Unit 2 cargue de DB |
| Cache de `/widget/config` | Sin cache → CDN edge (CloudFront) |
| Backup formal | `pg_dump` cron → RDS automated snapshots |
| Distributed tracing | pino logs → OpenTelemetry + Jaeger/AWS X-Ray |
| Logs centralizados | Docker logs stdout → CloudWatch Logs + structured queries |
| Secrets management | `.env` local → AWS Secrets Manager con KMS |

**Regla**: cada pivot debe ser **justificado por métrica observada** post-launch. No anticipar.

---

## 7. Docker Compose final (MVP)

Esqueleto del `docker-compose.yml` resultante:

```yaml
version: '3.9'

services:
  hermes:
    build: .
    container_name: hermes-app
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://hermes_app:${PG_APP_PASSWORD}@postgres:5432/hermes
      BEDROCK_REGION: ${BEDROCK_REGION}
      BEDROCK_MODEL_ID: ${BEDROCK_MODEL_ID}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      SFCC_BASE_URL: ${SFCC_BASE_URL}
      SFCC_CLIENT_ID: ${SFCC_CLIENT_ID}
      SFCC_CLIENT_SECRET: ${SFCC_CLIENT_SECRET}
      PII_SALT: ${PII_SALT}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      LOG_LEVEL: info
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/ready"]
      interval: 30s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    mem_limit: 1g
    cpus: 1.0

  postgres:
    image: postgres:16-alpine
    container_name: hermes-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_ROOT_PASSWORD}
      POSTGRES_DB: hermes
    volumes:
      - hermes_pg_data:/var/lib/postgresql/data
      - ./postgres-init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    mem_limit: 1g
    cpus: 1.0

volumes:
  hermes_pg_data:
```

> Detalle final del Dockerfile + scripts de init quedan para **Infrastructure Design** (próximo stage).

---

## 8. Security Compliance Summary

| Rule | Component pattern |
|---|---|
| SECURITY-01 | Postgres en Fase 2 con RDS-encrypted; MVP local FS aceptable + HTTPS outbound |
| SECURITY-06 | §2.2 roles `hermes_app` + `hermes_retention` |
| SECURITY-07 | §1 Docker network solo expone port 3000; postgres interno |
| SECURITY-10 | `:latest` evitado en Dockerfile (`node:20.18-alpine`, `postgres:16-alpine`) |
| SECURITY-12 | §5 secrets en env vars vía `.env` gitignored |
| Otros | Documentados en patterns + nfr-requirements §4 |

*No hay findings bloqueantes en este stage.*
