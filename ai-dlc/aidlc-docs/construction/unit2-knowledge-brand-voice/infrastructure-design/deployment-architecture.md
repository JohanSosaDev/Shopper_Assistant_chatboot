# Deployment Architecture — Unit 2: Knowledge & Brand Voice

> **Extiende** Unit 1 `deployment-architecture.md` con los pasos de Unit 2 (env vars adicionales, migration 0006, bootstrap BM, validación BM UI). Sin cambios estructurales.

---

## 1. Deployment diagram — sin cambios

```mermaid
flowchart LR
    Dev[Developer laptop]
    BM[Brand Manager]

    subgraph Host["Docker host (laptop)"]
        subgraph Network["docker network: hermes-net"]
            App[hermes container<br/>port 3000<br/>+ /admin/* routes]
            PG[(postgres + pgvector<br/>+ tablas U1 + U2)]
            App <-->|tcp 5432| PG
        end
        Volume[(hermes_pg_data)]
        PG -.persists.-> Volume
    end

    Bedrock[(AWS Bedrock)]
    SFCC[(SFCC OCAPI/SCAPI)]
    Client[Browser cliente final]

    Dev -->|docker compose + npm scripts| Host
    BM -->|HTTPS /admin/*| App
    Client -->|HTTP /chat etc| App
    App -->|HTTPS outbound| Bedrock
    App -->|HTTPS outbound| SFCC

    style App fill:#4CAF50,color:#fff
    style PG fill:#9cf,color:#000
```

---

## 2. Prerequisites (delta vs Unit 1)

Adicional a los prerequisites de Unit 1:

5. **JWT secret**:
   - String random ≥32 chars para firmar JWTs (`JWT_SECRET`). Generar con `openssl rand -hex 32`.
   - **Diferente** del `PII_SALT` de Unit 1 — ambos son secrets pero con propósitos distintos.

---

## 3. Updated Quick start (Unit 1 + Unit 2 end-to-end)

### Step 1 — Clonar y configurar
```bash
git clone <repo> && cd Shopper_Assistant_chatboot/hermes
cp .env.example .env
# Editar .env con TODAS las credenciales:
#   - AWS (Unit 1)
#   - SFCC OAuth (Unit 1)
#   - PII_SALT (Unit 1) — openssl rand -hex 32
#   - JWT_SECRET (Unit 2) — openssl rand -hex 32  ← NUEVO
#   - PG_APP_PASSWORD, PG_RETENTION_PASSWORD, POSTGRES_ROOT_PASSWORD
```

### Step 2 — Levantar containers
```bash
npm install
npm run up      # docker compose up -d --build
```

Esperar 30–60s a que healthchecks pasen verde.

### Step 3 — Migrations (Unit 1 + Unit 2)
```bash
npm run migrate
# Output esperado:
#   Applying 0001-init.sql ... OK
#   Applying 0002-consent-log.sql ... OK
#   Applying 0003-brand-config-seed.sql ... OK
#   Applying 0004-turn-log-audit.sql ... OK
#   Applying 0005-indexes.sql ... OK
#   Applying 0006-unit2-brand-config-redesign.sql ... OK
```

### Step 4 — Bootstrap del primer BM user (NUEVO Unit 2)
```bash
npm run create-bm

📝 Crear Brand Manager user

Email: bm-patprimo@pash.com.co
Password (oculto): <ingresa password ≥12 chars>
Confirm password (oculto): <ingresa la misma>
Display name: María Brand Manager Patprimo
Role [brand_manager]: brand_manager
Brand scopes [patprimo]: patprimo

✅ User created: a1b2c3d4-e5f6-...
Para login: http://localhost:3000/admin/login
```

> **Para Operador / Admin**: re-ejecutar `npm run create-bm` con `Role: operator` o `admin` y los `Brand scopes` apropiados (operator/admin = cross-brand, scopes ignorados).

### Step 5 — Seed data adicional para demo (NUEVO Unit 2)
```bash
npm run seed
# Aplica:
#   - Sample orders en mock SFCC (Unit 1)
#   - El seed Patprimo de brand_config_versions ya viene de la migration 0006
#   - Nada adicional para Unit 2 (los drafts los crea el BM via UI)
```

### Step 6 — Verificar — health + chat (Unit 1)
```bash
curl http://localhost:3000/health/ready
# → {"status":"ok"}

curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test-conv-1","brand":"patprimo","message":"hola"}'
# → respuesta del saludo + consent prompt (debe mencionar a "Sofía de Patprimo")
```

### Step 7 — Verificar BM UI accessible (NUEVO Unit 2)
```bash
# Browser:
open http://localhost:3000/admin/login

# CLI smoke test:
curl -i http://localhost:3000/admin/login
# → 200 con HTML del login form

# Login programático smoke test:
curl -X POST http://localhost:3000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bm-patprimo@pash.com.co","password":"<your-password>"}'
# → 200 con {token, user: {name, brands}}
```

### Step 8 — Demo flow del BM UI
1. Browser a `http://localhost:3000/admin/login`
2. Login con `bm-patprimo@pash.com.co` + password
3. Dashboard muestra la versión seed Patprimo (status `active`)
4. Click "Nuevo borrador" → editor → crear v2 con cambios menores en el system prompt
5. Save → status `draft` en el dashboard
6. Click el draft → detail page → click "Aprobar" → modal con comment → confirma
7. Status pasa a `approved` → click "Activar" → modal de confirmación → confirma
8. Status pasa a `active`; la versión seed pasa a `archived`
9. Volver a `/chat` smoke test del Step 6 → respuesta usa el nuevo system prompt

---

## 4. Env vars matrix actualizada (Unit 1 + Unit 2)

Total: 22 variables (16 de Unit 1 + 4 de Unit 2 + 2 fijos extras).

| # | Variable | Required | Default | Origen |
|---|---|---|---|---|
| 1 | `NODE_ENV` | sí | `development` | U1 |
| 2 | `PORT` | no | 3000 | U1 |
| 3 | `DATABASE_URL` | sí | — | U1 |
| 4 | `BEDROCK_REGION` | sí | `sa-east-1` | U1 |
| 5 | `BEDROCK_MODEL_ID` | sí | `anthropic.claude-haiku-4-5:0` | U1 |
| 6 | `AWS_ACCESS_KEY_ID` | sí | — | U1 |
| 7 | `AWS_SECRET_ACCESS_KEY` | sí | — | U1 |
| 8 | `SFCC_BASE_URL` | sí | — | U1 |
| 9 | `SFCC_CLIENT_ID` | sí | — | U1 |
| 10 | `SFCC_CLIENT_SECRET` | sí | — | U1 |
| 11 | `PII_SALT` | sí | — | U1 |
| 12 | `ALLOWED_ORIGINS` | sí | — | U1 |
| 13 | `RATE_LIMIT_IP_MAX` | no | 30 | U1 |
| 14 | `RATE_LIMIT_CONV_MAX` | no | 10 | U1 |
| 15 | `LOG_LEVEL` | no | `info` | U1 |
| 16 | `PG_APP_PASSWORD` | sí | — | U1 |
| 17 | `PG_RETENTION_PASSWORD` | sí | — | U1 |
| 18 | `POSTGRES_ROOT_PASSWORD` | sí | — | U1 |
| 19 | **`JWT_SECRET`** | sí | — | **U2** |
| 20 | **`JWT_EXP_SECONDS`** | no | 28800 | **U2** |
| 21 | **`BCRYPT_ROUNDS`** | no | 12 | **U2** |
| 22 | **`ADMIN_UI_ENABLED`** | no | `true` | **U2** |

---

## 5. `.env.example` final (Unit 1 + Unit 2)

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

# === Security — Unit 1 ===
PII_SALT=                                  # openssl rand -hex 32
ALLOWED_ORIGINS=http://localhost:3000

# === Rate limiting ===
RATE_LIMIT_IP_MAX=30
RATE_LIMIT_CONV_MAX=10

# === Brand Manager / Admin (Unit 2) ===
JWT_SECRET=                                # openssl rand -hex 32 (DIFERENTE de PII_SALT)
JWT_EXP_SECONDS=28800                      # 8 horas
BCRYPT_ROUNDS=12
ADMIN_UI_ENABLED=true
```

---

## 6. Backup procedure (Q3=B — manual)

### 6.1 On-demand backup
```bash
npm run backup
# Output: backups/hermes_20260520_103000.sql
```

### 6.2 Runbook Demo Day (2026-06-09)
1. Día anterior al Demo (2026-06-08 EOD):
   ```bash
   npm run backup
   # Verificar el archivo existe + size > 0
   ls -la backups/
   ```
2. Antes del demo (mismo día):
   ```bash
   npm run backup     # snapshot fresh con eventuales last-minute changes
   ```
3. Si demo se rompe mid-show:
   - **NO restorar** — slow.
   - Si es A/B activo: `setSplit(hermesPercent=0)` desde admin UI o via SQL directo → tráfico al Oct8ne legacy.
4. Post-demo:
   ```bash
   npm run backup     # preservar estado final del demo
   ```

### 6.3 Restore (runbook completo)
```bash
docker compose down -v          # ⚠️ destruye el volume actual
docker compose up -d postgres
sleep 5                          # esperar healthcheck
docker compose exec -T postgres psql -U postgres -d hermes < backups/hermes_<timestamp>.sql
docker compose up -d hermes
npm run logs                     # verificar startup verde
```

---

## 7. Rollback procedure delta (Unit 2 adiciones)

### 7.1 Si BM UI rompe runtime del chat
- BM UI vive en mismo proceso → si crashea, /chat también cae. **Mitigación**: feature flag `ADMIN_UI_ENABLED=false` + restart → BM UI no se monta + /chat sigue funcionando.
- En MVP esto se hace **manualmente**; Fase 2 → feature flag por env var en producción.

### 7.2 Si un BM brick una versión (active rompe el bot)
- Otro Operador entra al admin UI → dashboard → selecciona versión `archived` previa conocida buena → click "Activar" (R-BC-6 rollback = re-activate)
- Tiempo objetivo de rollback: <1 minuto.
- Si admin UI también está roto: directo en DB:
  ```sql
  BEGIN;
  UPDATE brand_config_versions SET status='archived' WHERE brand='patprimo' AND status='active';
  UPDATE brand_config_versions SET status='active', activated_at=NOW() WHERE version_id='<known-good-version>';
  COMMIT;
  ```

### 7.3 Si seed BM user se pierde (forgot password)
- Re-ejecutar `npm run create-bm` con un email nuevo, o:
- Update directo en DB del password hash:
  ```bash
  docker compose exec hermes node -e "console.log(require('bcrypt').hashSync('NEW-PASSWORD', 12))"
  # Pegar el hash en SQL:
  docker compose exec postgres psql -U postgres -d hermes \
    -c "UPDATE brand_manager_users SET password_hash='<hash>', failed_attempts=0, locked_until=NULL WHERE email='<email>';"
  ```

---

## 8. Demo Day operational notes (delta Unit 2)

Además de los pasos de Unit 1:

1. **Pre-demo (1h antes)**:
   - Login a `/admin/login` con BM seed user → verificar token funcional
   - Crear v_demo como draft con un cambio visible en system prompt (ej. agregar emoji al greeting) — **NO activar todavía**
   - Verificar `/chat` smoke test con versión actual (sin emoji) → captura screenshot baseline
2. **Durante demo — flujo BM UI**:
   - Mostrar dashboard con versión `active` actual
   - Mostrar v_demo como `draft`
   - Aprobar v_demo (mostrar el modal de comment)
   - Activar v_demo
   - Mostrar `/chat` ahora con la nueva voz (con emoji) — diferencia visible
   - Rollback en vivo: click "Activar" sobre versión `archived` previa → `/chat` vuelve al comportamiento original
3. **Post-demo**:
   - `npm run backup` con los cambios del demo
   - Reset opcional: rollback a versión seed para futuras demos

---

## 9. Out-of-scope (MVP) — sin cambios

Mismas exclusiones que Unit 1: sin staging/prod, sin VPC, sin K8s, sin monitoring centralizado, sin backup automation.

---

## 10. Security Compliance Summary

| Rule | Status | Implementación |
|---|---|---|
| SECURITY-09 | Aplicado | `.env` con `CHANGE_ME` placeholders — startup falla si quedan en CHANGE_ME (env.ts Zod) |
| SECURITY-10 | Aplicado | Migration sequence determinística; npm scripts pinneados |
| SECURITY-12 | Aplicado | `npm run create-bm` enforce min 12 chars; password nunca logueado; bcrypt aplicado server-side |
| Otros | Cubiertos en stages anteriores | — |

*No hay findings bloqueantes en este stage.*
