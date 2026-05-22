# Deployment Architecture — Unit 1: Core Agente

> **MVP scope**: deployment local Docker Compose. Pasos concretos para levantar el sistema desde cero.

---

## 1. Deployment diagram (MVP local)

```mermaid
flowchart LR
    Dev[Developer laptop<br/>Windows / macOS / Linux]

    subgraph Host["Docker host (laptop)"]
        subgraph Network["docker network: hermes-net (bridge)"]
            App[hermes container<br/>Node 20 + Fastify<br/>:3000]
            PG[(postgres container<br/>Postgres 16 + pgvector<br/>:5432)]
            App <-->|tcp 5432| PG
        end
        Volume[(volumen: hermes_pg_data)]
        PG -.persists.-> Volume
    end

    Bedrock[(AWS Bedrock<br/>sa-east-1 / fallback us-east-1<br/>Claude Haiku 4.5)]
    SFCC[(SFCC OCAPI/SCAPI<br/>orders endpoint)]
    Browser[Browser cliente<br/>vía widget en SFCC storefront]

    Dev -->|docker compose up| Host
    App -->|HTTPS outbound| Bedrock
    App -->|HTTPS outbound| SFCC
    Browser -->|HTTP localhost:3000| App

    style App fill:#4CAF50,color:#fff
    style PG fill:#9cf,color:#000
    style Bedrock fill:#FFB300,color:#000
    style SFCC fill:#FFB300,color:#000
```

---

## 2. Prerequisites

Antes de levantar Hermes el desarrollador necesita:

1. **Software local**:
   - Docker Desktop ≥4.x (con Docker Compose v2)
   - Node.js ≥20 LTS (para correr `npm install` localmente para lint/test/typecheck)
   - Git (para clonar)

2. **Credenciales AWS**:
   - `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` con permiso `bedrock:InvokeModel` sobre el modelo `anthropic.claude-haiku-4-5:0` en la región elegida.
   - Acceso confirmado vía `aws bedrock list-foundation-models --region sa-east-1` antes de seguir.

3. **Credenciales SFCC**:
   - OAuth2 client ID + secret con scope para OMS (`get_order_status`).
   - Endpoint base URL del SFCC merchant.

4. **PII salt**:
   - String random ≥32 chars para hashing PII (`PII_SALT`). Generar con `openssl rand -hex 32`.

---

## 3. Quick start (developer setup)

### Step 1 — Clonar y configurar
```bash
git clone <repo> && cd Shopper_Assistant_chatboot/hermes
cp .env.example .env
# Editar .env con las credenciales reales (AWS, SFCC, PII_SALT, etc.)
```

### Step 2 — Levantar
```bash
npm install              # deps para tooling local (lint, test, typecheck)
npm run up               # docker compose up -d (build + start app + postgres)
```

Esperar 30-60s a que healthchecks pasen verde.

### Step 3 — Inicializar DB
```bash
npm run migrate          # corre las 5 migrations
npm run seed             # carga brand_config Patprimo + sample orders
```

### Step 4 — Verificar
```bash
curl http://localhost:3000/health/ready    # → {"status":"ok"}
curl http://localhost:3000/ab/decide?brand=patprimo&sessionId=test    # → {"target":"hermes"}
```

### Step 5 — Smoke test del chat
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test-conv-1","brand":"patprimo","message":"hola"}'
# → debería devolver el saludo + consent prompt
```

### Step 6 — Logs
```bash
npm run logs             # tail real-time de la app
```

---

## 4. Environment variables matrix

| Variable | Required | Default | Source | Notas |
|---|---|---|---|---|
| `NODE_ENV` | sí | — | `.env` | `development` para dev-local |
| `PORT` | no | 3000 | `.env` | |
| `DATABASE_URL` | sí | — | `.env` | `postgres://hermes_app:<pw>@postgres:5432/hermes` |
| `BEDROCK_REGION` | sí | — | `.env` | `sa-east-1` o `us-east-1` |
| `BEDROCK_MODEL_ID` | sí | — | `.env` | `anthropic.claude-haiku-4-5:0` |
| `AWS_ACCESS_KEY_ID` | sí | — | `.env` | desde AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | sí | — | `.env` | desde AWS IAM |
| `SFCC_BASE_URL` | sí | — | `.env` | URL del merchant SFCC |
| `SFCC_CLIENT_ID` | sí | — | `.env` | OAuth client |
| `SFCC_CLIENT_SECRET` | sí | — | `.env` | OAuth client |
| `PII_SALT` | sí | — | `.env` | ≥32 chars random |
| `ALLOWED_ORIGINS` | sí | — | `.env` | `http://localhost:3000,https://*.patprimo.com.co` |
| `RATE_LIMIT_IP_MAX` | no | 30 | `.env` | requests/min/IP |
| `RATE_LIMIT_CONV_MAX` | no | 10 | `.env` | turns/min/conversation |
| `LOG_LEVEL` | no | `info` | `.env` | `debug` para dev local |
| `PG_APP_PASSWORD` | sí | — | `.env` | password del rol `hermes_app` |
| `PG_RETENTION_PASSWORD` | sí | — | `.env` | password del rol `hermes_retention` |
| `POSTGRES_ROOT_PASSWORD` | sí | — | `.env` | password del superuser postgres (solo init) |

---

## 5. `.env.example` (committed, sin secrets reales)

```env
# === Application ===
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# === Database ===
DATABASE_URL=postgres://hermes_app:CHANGE_ME@postgres:5432/hermes
POSTGRES_ROOT_PASSWORD=CHANGE_ME
PG_APP_PASSWORD=CHANGE_ME
PG_RETENTION_PASSWORD=CHANGE_ME

# === AWS Bedrock ===
BEDROCK_REGION=sa-east-1
BEDROCK_MODEL_ID=anthropic.claude-haiku-4-5:0
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# === SFCC ===
SFCC_BASE_URL=
SFCC_CLIENT_ID=
SFCC_CLIENT_SECRET=

# === Security ===
PII_SALT=                          # generar con: openssl rand -hex 32
ALLOWED_ORIGINS=http://localhost:3000

# === Rate limiting ===
RATE_LIMIT_IP_MAX=30
RATE_LIMIT_CONV_MAX=10
```

---

## 6. Secrets flow

```text
┌─────────────────────────────┐
│  Developer laptop            │
│                              │
│  .env (gitignored)           │
│  ├── AWS keys                │
│  ├── SFCC OAuth              │
│  ├── DB passwords            │
│  └── PII_SALT                │
└──────┬───────────────────────┘
       │ docker-compose carga .env en env vars de cada container
       ▼
┌─────────────────────────────┐
│ Container env               │
│  process.env.AWS_*           │
│  process.env.SFCC_*          │
│  process.env.PII_SALT        │
└──────┬───────────────────────┘
       │ env.ts (Zod schema validation fail-fast at startup)
       ▼
┌─────────────────────────────┐
│ Validated config singleton  │
│ Usado en services via       │
│ fastify.decorate('config')  │
└─────────────────────────────┘
```

**Reglas**:
- `.env` NUNCA committed (en `.gitignore`).
- `.env.example` committed (template).
- Pre-commit hook bloquea cualquier file que contenga regex de AWS keys.

---

## 7. Build process

### 7.1 Multistage Dockerfile

```dockerfile
# Stage 1: build
FROM node:20.18-alpine AS build
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: runtime
FROM node:20.18-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
```

**Notas**:
- `USER node`: corre como usuario non-root (SECURITY-09 hardening).
- `curl` requerido para Docker healthcheck.
- Multistage reduce el tamaño final (~150 MB vs ~600 MB sin multistage).

### 7.2 Postgres init script

```sql
-- /docker-entrypoint-initdb.d/init.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE hermes;
\c hermes;

CREATE ROLE hermes_app WITH LOGIN PASSWORD :'app_password';
CREATE ROLE hermes_retention WITH LOGIN PASSWORD :'retention_password';

GRANT CONNECT ON DATABASE hermes TO hermes_app, hermes_retention;
```

> El env var sustitution es vía template + entrypoint custom; alternativamente con `psql -v app_password=...`. Detalle final se aterriza en Code Generation.

---

## 8. Rollback procedure

### 8.1 Si Hermes app crashea en runtime
```bash
docker compose restart hermes
# o si está totalmente roto:
docker compose down && docker compose up -d
```

### 8.2 Si migration falla
- `postgres-migrations` NO tiene `down` migrations (up-only).
- Recovery: si una migration corrompe schema → restaurar desde el snapshot manual previo OR `npm run reset && npm run migrate` (datos se pierden, regenerables con seed).

### 8.3 Si secrets se commitean por accidente
1. Rotar TODAS las credenciales en AWS y SFCC inmediatamente.
2. Force-push para eliminar del git history (`git filter-repo`).
3. Notificar a security PASH.
4. Post-mortem y reforzar pre-commit hook.

---

## 9. Demo Day operational notes

Para el Demo Day del programa Hardcore AI 30X (2026-06-09):

1. **Pre-demo checklist** (día anterior):
   - `npm run rebuild && npm run up` — build fresh
   - `npm run migrate && npm run seed` — DB lista con sample data
   - Curl smoke test (`/health/ready`, `/chat` hello)
   - Verificar conexión Bedrock + SFCC con un turn real

2. **Durante el demo**:
   - Terminal 1: `npm run logs` (tail visible para audience)
   - Terminal 2: browser con widget abierto
   - Si crashea mid-demo: `npm run up` recovers en <1 min

3. **Post-demo**:
   - Export logs: `docker compose logs hermes > demo-day-logs.txt`
   - Snapshot manual: `docker compose exec postgres pg_dump -U postgres hermes > demo-day-snapshot.sql`

---

## 10. Forward-looking (Fase 2 — NO en MVP)

Cuando llegue Fase 2 con sponsor confirmado:

| Componente actual | Reemplazo Fase 2 |
|---|---|
| Docker Compose local | ECS Fargate (1 task min, auto-scale 1-3) |
| Postgres container | RDS PostgreSQL 16 Multi-AZ |
| Volume local | EBS gp3 con automated snapshots |
| `.env` local | AWS Secrets Manager con KMS |
| Outbound directo a Bedrock | VPC endpoint a Bedrock (sin NAT egress) |
| Logs en stdout | CloudWatch Logs structured |
| Sin alerts | CloudWatch Alarms → SNS → Slack |
| Sin distributed tracing | AWS X-Ray |
| Healthcheck en puerto local | ALB target group health check |

---

## 11. Security Compliance Summary

| Rule | Status | Implementación |
|---|---|---|
| SECURITY-04 | Aplicado | Helmet headers en Fastify (NFR §4.4) |
| SECURITY-07 | Aplicado | §1 + §5.2 binding a 127.0.0.1; Docker private network |
| SECURITY-09 | Aplicado | §7.1 `USER node` non-root; sin default credentials (CHANGE_ME); §5 .env mandatory |
| SECURITY-10 | Aplicado | §7.1 pinned versions; npm ci con lock file |
| SECURITY-12 | Aplicado parcial | §6 secrets en .env local; rotación obligatoria post-commit accidente |
| Otros | Cubiertos en NFR Design + Functional Design | — |

*No hay findings bloqueantes en este stage.*
