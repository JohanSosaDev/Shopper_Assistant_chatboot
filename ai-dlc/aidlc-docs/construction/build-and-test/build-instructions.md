# Build Instructions — Hermes MVP (Units 1+2+3)

> **Scope**: instrucciones consolidadas para build local del MVP en `dev-local` (Docker Compose en laptop). Sin staging/prod en scope MVP.
> **Codigo**: aún NO generado — los Code Generation stages de U1/U2/U3 están diferidos. Este documento describe lo que se construirá cuando se ejecute CG.

---

## 1. Prerequisites

| Requisito | Versión | Verificación |
|---|---|---|
| Docker | ≥24.x | `docker --version` |
| Docker Compose | ≥2.20 | `docker compose version` |
| Node.js | 20 LTS | `node -v` (debe decir v20.x) |
| npm | ≥10.x | `npm -v` |
| Git | reciente | `git --version` |
| OS | Windows 10+/macOS/Linux | n/a |

**Recursos mínimos del host**:
- 4 GiB RAM disponible (Hermes ~1 GiB + Postgres ~1 GiB + mailhog ~64 MiB + buffer)
- 2 vCPU
- 10 GB disco libre

**Credenciales externas** (a obtener antes del build):
- AWS account con acceso a Bedrock LATAM (`sa-east-1` o equivalente con Haiku 4.5 disponible)
- SFCC OCAPI/SCAPI credentials (`SFCC_HOST`, `SFCC_CLIENT_ID`, `SFCC_CLIENT_SECRET`)
- (Opcional U3) Slack incoming webhook URL para `#hermes-alerts`

---

## 2. Clonar y configurar

```bash
git clone <repo> Shopper_Assistant_chatboot
cd Shopper_Assistant_chatboot/hermes
cp .env.example .env
```

**Editar `.env`** con todos los secrets (ver `aidlc-docs/construction/unit3-handoff-convivencia/infrastructure-design/deployment-architecture.md` §5 para el archivo completo). Total 28 variables: 19 obligatorias + 9 con default.

Secrets a generar localmente:
```bash
# PII_SALT (Unit 1)
openssl rand -hex 32

# JWT_SECRET (Unit 2)
openssl rand -hex 32

# Postgres passwords (3 distintas para 3 roles):
#   POSTGRES_ROOT_PASSWORD, PG_APP_PASSWORD, PG_RETENTION_PASSWORD
```

---

## 3. Build steps

### 3.1 Install dependencies
```bash
npm install
```

Instala todas las deps consolidadas:
- **Unit 1**: fastify, pg, zod, pino, undici, bcrypt, fast-check, vitest, supertest, @fastify/{helmet,rate-limit,cors,type-provider-zod}, @aws-sdk/client-bedrock-runtime, etc.
- **Unit 2**: bcrypt, jsonwebtoken, @fastify/jwt, ejs, @fastify/view, @fastify/static
- **Unit 3**: nodemailer, node-cron, @types/nodemailer

Tiempo esperado: ~60-90s en conexión normal.

### 3.2 Levantar contenedores
```bash
npm run up
# = docker compose up -d --build
```

Levanta 3 servicios:
| Servicio | Imagen | Puerto host |
|---|---|---|
| `hermes` | Build local (Node 20 alpine multistage) | `127.0.0.1:3000` |
| `postgres` | `pgvector/pgvector:pg16` (image upstream) | `127.0.0.1:5432` |
| `mailhog` | `mailhog/mailhog:latest` | `127.0.0.1:1025` (SMTP) + `127.0.0.1:8025` (Web UI) |

Esperar 30-60s a que healthchecks pasen verde:
```bash
docker compose ps
# Todos deben mostrar "healthy" o "running"
```

### 3.3 Ejecutar migrations (11 acumuladas)
```bash
npm run migrate
```

Output esperado (orden cronológico):
```
Applying 0001-init.sql ... OK              (U1)
Applying 0002-consent-log.sql ... OK       (U1)
Applying 0003-brand-config-seed.sql ... OK (U1)
Applying 0004-turn-log-audit.sql ... OK    (U1)
Applying 0005-indexes.sql ... OK           (U1)
Applying 0006-unit2-brand-config-redesign.sql ... OK (U2 — DROP+CREATE)
Applying 0007-unit3-system-config.sql ... OK         (U3 — append-only)
Applying 0008-unit3-system-config-audit.sql ... OK   (U3)
Applying 0009-unit3-handoff-ticket.sql ... OK        (U3)
Applying 0010-unit3-alerts.sql ... OK                (U3 — 5 reglas builtin seed)
Applying 0011-unit3-turn-log-audit-extend.sql ... OK (U3 — ALTER + indexes)
```

Tiempo esperado: <10s total.

### 3.4 Seed inicial
```bash
npm run seed
# Aplica: sample orders en mock SFCC + cualquier seed adicional
```

El seed Patprimo de `brand_config_versions` ya viene de migration 0006. El seed de `system_config` defaults ya viene de migration 0007. Los 5 alert rules builtin ya vienen de migration 0010.

### 3.5 Bootstrap del primer Brand Manager / Operator (Unit 2)
```bash
npm run create-bm
# Script interactivo: pide email + password + role + brand_scopes
```

**Crear al menos 2 users para MVP**:
- 1 con `role=operator` (acceso a dashboards/alerts/handoff-tickets U3)
- 1 con `role=admin` (acceso adicional a `/admin/rollout/*` U3)

Si solo se crea 1 user, usar `role=admin` (cubre operator + admin).

### 3.6 Verificación post-build
```bash
# Health check
curl http://localhost:3000/health/ready
# → {"status":"ok","postgres":"ok","bedrock":"ok","sfcc":"ok"}

# Smoke test /chat (U1)
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"smoke-1","brand":"patprimo","message":"hola"}'

# Verificar mailhog UI vacío
open http://localhost:8025

# Login + ver rollout config (U3)
TOKEN=$(curl -sX POST http://localhost:3000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"<admin-password>"}' | jq -r .token)

curl http://localhost:3000/admin/rollout/config -H "Authorization: Bearer $TOKEN"
# → {"hermes_enabled":true,"hermes_traffic_percentage":0,"updated_at":"..."}
```

---

## 4. Build artifacts producidos

### 4.1 Estructura esperada post-build

```
hermes/
├── dist/                          # TS compilado (post `npm run build`)
├── node_modules/
├── backups/                       # snapshots pg_dump (gitignored)
├── coverage/                      # output de Vitest coverage (gitignored)
├── src/
│   ├── config/, lib/, models/, repositories/, services/, plugins/, controllers/, jobs/
│   ├── views/                     # EJS templates (Unit 2)
│   ├── public/admin/              # static assets BM UI
│   └── composition.ts             # composition root con DI wiring
├── prompts/
│   ├── patprimo-system-prompt.txt           (U1)
│   ├── sentiment_lexicon_es_co.json         (U3)
│   └── handoff_category_map.json            (U3)
├── migrations/                    # 11 archivos SQL
├── scripts/                       # create-bm, backup, restore
├── widget/                        # cliente JS vanilla
├── tests/                         # unit + integration + PBT
├── Dockerfile                     # multistage (build + runtime alpine)
├── docker-compose.yml             # 3 servicios
├── package.json
├── tsconfig.json
└── .env                           # gitignored
```

### 4.2 npm scripts disponibles (consolidados U1+U2+U3)

| Script | Comando | Descripción |
|---|---|---|
| `up` | `docker compose up -d --build` | Levanta los 3 containers |
| `down` | `docker compose down` | Detiene los containers (preserva volume) |
| `down:nuke` | `docker compose down -v` | Detiene + borra volume (data loss) |
| `restart` | `docker compose restart hermes` | Reinicia solo app (no migrations) |
| `migrate` | Ejecuta migraciones pendientes | Idempotente |
| `seed` | Carga data de demo | Idempotente con ON CONFLICT |
| `create-bm` | Interactive CLI para crear BM user | Hereda U2 |
| `backup` | `pg_dump` full a `backups/` | Hereda U2 + tablas U3 |
| `restore` | Restaura desde backup | Hereda U2 |
| `dev` | `tsx watch src/main.ts` | Dev hot-reload (sin Docker) — opcional |
| `build` | `tsc` | Compila TS a `dist/` |
| `start` | `node dist/main.js` | Runtime prod |
| `lint` | `eslint .` | Lint checks |
| `format` | `prettier --write .` | Format checks |
| `test` | `vitest run` | Todos los tests |
| `test:unit` | `vitest run tests/unit` | Solo unit |
| `test:integration` | `vitest run tests/integration` | Integration con docker compose |
| `test:pbt` | `vitest run tests/pbt` | Solo property-based tests |
| `test:coverage` | `vitest run --coverage` | Coverage report |

---

## 5. Build verification checklist

Antes de considerar el build "ready for Demo Day":

- [ ] Los 3 containers (hermes + postgres + mailhog) están healthy
- [ ] Las 11 migraciones aplicadas sin error
- [ ] Seed data presente: brand_config_versions Patprimo, system_config defaults, 5 alert_rules builtin
- [ ] Al menos 1 user admin creado via `create-bm`
- [ ] `GET /health/ready` retorna `200 ok`
- [ ] `POST /chat` happy path responde con saludo Patprimo
- [ ] `GET /admin/dashboard` retorna 200 con JWT válido
- [ ] mailhog web UI accesible en `localhost:8025`
- [ ] (Opcional) Slack test webhook responde 200 si `SLACK_WEBHOOK_URL` está configurado
- [ ] `npm run backup` produce snapshot en `backups/`
- [ ] `npm run test` corre sin fallos (modulo flaky tests por mocks de Bedrock)

---

## 6. Build troubleshooting

### 6.1 `docker compose up` falla en healthcheck postgres
```bash
# Reset volume:
npm run down:nuke
npm run up
```
**Causa común**: passwords en `.env` cambiados sin reset del volume → mismatch con data persistida.

### 6.2 Migration `0006-unit2-brand-config-redesign.sql` falla
```bash
# Esta es la única migration con DROP (U2 Q5=B). Verificar:
docker compose exec postgres psql -U postgres -d hermes \
  -c "SELECT count(*) FROM brand_configs;"
# Si tabla no existe → primera vez (esperado).
# Si tabla con data → backup primero, después aceptar pérdida del seed U1.
```

### 6.3 `npm install` falla con error en `bcrypt`
- Windows: necesita Build Tools (`npm install --global windows-build-tools` o Visual Studio Build Tools)
- Alternativa: usar `bcryptjs` (pure JS) — más lento pero sin compile step. **Decisión Code Gen**: pinned a `bcrypt` 5.x (TD-U2-1); ver §3.1.

### 6.4 mailhog port conflict (`1025` ya en uso)
```bash
# Editar docker-compose.yml port mapping:
# "127.0.0.1:11025:1025"
# Y actualizar .env: SMTP_PORT=11025
```

### 6.5 Bedrock auth failure
```bash
# Verificar credenciales:
docker compose exec hermes sh -c \
  'echo "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" | head -c 30'
# Debe imprimir las primeras 30 chars sin secret real
```

Si el problema persiste → verificar IAM policy del access key incluye `bedrock:InvokeModel` permission.

### 6.6 Pipeline `/chat` retorna 500
```bash
docker compose logs hermes --tail=50 | grep -i error
```
Causas comunes:
- Bedrock region no soporta Haiku 4.5 → cambiar `BEDROCK_REGION`
- SFCC OAuth falla → verificar `SFCC_OAUTH_TOKEN_URL` y refrescar credentials
- Postgres connection pool exhausted → revisar `DATABASE_URL` y volume health

---

## 7. Build performance (informativo)

| Operación | Tiempo esperado (laptop dev) |
|---|---|
| `npm install` (fresh) | 60-90s |
| `npm run up` (build initial) | 90-180s |
| `npm run up` (cached) | 5-15s |
| `npm run migrate` (11 migraciones) | <10s |
| `npm run seed` | <5s |
| `npm run create-bm` (interactive) | ~30s (bcrypt 12 rounds = 250ms del total) |
| `npm run build` (`tsc`) | 5-15s |
| `npm run test:unit` (~50 tests esperados) | 10-30s |
| `npm run test:integration` (con docker compose) | 60-120s |
| `npm run backup` | <5s a MVP volume |

---

## 8. Next steps

Una vez completado el build con éxito:
1. Ejecutar suite de unit tests → `aidlc-docs/construction/build-and-test/unit-test-instructions.md`
2. Ejecutar suite de integration tests → `aidlc-docs/construction/build-and-test/integration-test-instructions.md`
3. (Opcional) Ejecutar performance soft validation → `aidlc-docs/construction/build-and-test/performance-test-instructions.md`
4. Demo Day runbook → `aidlc-docs/construction/unit3-handoff-convivencia/infrastructure-design/deployment-architecture.md` §6
