# Tech Stack Decisions — Unit 2: Knowledge & Brand Voice

> Adiciones al stack de Unit 1 + decisiones específicas Unit 2 (auth libs, templating, migration).

---

## 1. Stack heredado (de Unit 1 — sin cambio)

| Capa | Tecnología | Origen |
|---|---|---|
| Lenguaje | TypeScript strict | Unit 1 ADR-1 |
| Runtime | Node.js 20 LTS | Unit 1 |
| Web framework | Fastify monolithic + plugins | Unit 1 ADR-1 |
| DI | `fastify.decorate` | Unit 1 ADR-2 |
| DB | PostgreSQL 16 + pgvector | Unit 1 ADR-3 |
| DB driver | `pg` raw | Unit 1 ADR-3 |
| Migrations | `postgres-migrations` | Unit 1 TD-1 (OD-2) |
| Validation | Zod + `fastify-type-provider-zod` | Unit 1 ADR-5 |
| Logger | pino structured JSON | Unit 1 |
| HTTP outbound | undici | Unit 1 |
| Security headers | `@fastify/helmet` | Unit 1 |
| Rate limit | `@fastify/rate-limit` + Postgres storage | Unit 1 |
| CORS | `@fastify/cors` | Unit 1 |
| Tests | Vitest + Supertest | Unit 1 TD-2..TD-5 |
| PBT | fast-check | Unit 1 |
| Container | Docker Compose | Unit 1 |

---

## 2. Adiciones nuevas Unit 2

### 2.1 Auth dependencies (Q1=B, Q2=A)

| Library | Versión target | Propósito |
|---|---|---|
| `bcrypt` | 5.x | Password hashing con saltRounds=12 |
| `jsonwebtoken` | 9.x | JWT sign + verify para sesión BM |
| `@fastify/jwt` | 8.x | Plugin Fastify para auth JWT en routes |

**Por qué `bcrypt` (no argon2)**:
- bcrypt es battle-tested + ampliamente entendido + OWASP-recommended para el use case (low-volume admin auth)
- argon2 es objetivamente mejor en algunos aspectos pero agrega learning curve sin ROI claro para 3-5 users
- Recomendación Fase 2: re-evaluar argon2 si user count crece a >50

**Por qué `jsonwebtoken` directo (no Paseto)**:
- JWT es estándar industria + soportado nativamente por `@fastify/jwt`
- Paseto es teóricamente más seguro pero ecosistema menos maduro
- Para MVP, JWT + buenas prácticas (HMAC-SHA256, short exp, blacklist) son defendibles

### 2.2 Templating engine para BM UI

**Decisión pendiente: a confirmar en NFR Design Unit 2.**

Opciones probables:
- **EJS** (3.x) — server-rendered HTML con embed de JS; minimal learning curve; integra con Fastify via `@fastify/view`.
- **Nunjucks** (3.x) — más features que EJS pero más complejo.
- **Pure HTML + vanilla JS hydration** — sin templating server-side; HTMx-style con server endpoints retornando HTML fragments.

**Recomendación tentativa**: EJS + `@fastify/view` (próximo NFR Design lo confirma).

### 2.3 Diff visualization (Brand Manager UI requirement R-UI-3)

Para mostrar diff entre versiones (`system_prompt` text + `few_shot_examples` JSON):

- **Server-side diff**: `diff` package (jsdiff) — calcula diff en backend y manda HTML pre-renderado.
- **Client-side diff**: librería vanilla diff (`diff` o `jsdiff` también compatible client).
- **Recomendación tentativa**: server-side; mantiene cliente liviano.

**Decisión final en Code Generation cuando se ejecute.**

### 2.4 Frontend assets — BM UI

- **CSS framework**: ninguno (vanilla CSS con BEM); MVP no justifica Tailwind/Bootstrap.
- **Bundler para BM UI client-side JS**: NINGUNO si vamos server-rendered EJS (cero build step). Si elegimos vanilla JS hydration → esbuild como widget cliente.

---

## 3. Open Decision adicional cerrada en Unit 2

### OD-FE-BM (nueva, no estaba en Unit 1): Estrategia frontend Brand Manager UI

**Decisión**: server-rendered EJS + JS progresivo (a ratificar en NFR Design Unit 2).

**Razón**: Q4=A (browsers modern desktop only) permite confiar en JS moderno; server-rendered minimiza moving parts + facilita SEO/loading speed; sin bundle step en MVP.

---

## 4. Migration strategy (Q5=B — drop + create + seed)

### 4.1 Migration sequence

La migration de Unit 2 ejecuta en este orden:

```sql
-- Migration 0006-unit2-brand-config-redesign.sql

BEGIN;

-- Step 1: Drop tabla vieja de Unit 1 (era stub seed)
DROP TABLE IF EXISTS brand_configs;

-- Step 2: Crear tabla nueva con schema Unit 2 completo
CREATE TABLE brand_config_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','approved','active','archived')),
  system_prompt TEXT NOT NULL CHECK (length(system_prompt) BETWEEN 100 AND 10000),
  few_shot_examples JSONB NOT NULL,
  customer_facing_name TEXT NOT NULL,
  tone TEXT NOT NULL CHECK (tone IN ('formal_close','casual','formal')),
  language TEXT NOT NULL DEFAULT 'es-CO',
  consent_request_text TEXT NOT NULL,
  consent_denied_text TEXT NOT NULL,
  neutral_fallback_text TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

-- Constraint: máximo 1 versión active por brand
CREATE UNIQUE INDEX brand_config_versions_active_unique
  ON brand_config_versions (brand)
  WHERE status = 'active';

-- Index para listings rápidos
CREATE INDEX brand_config_versions_brand_status_created
  ON brand_config_versions (brand, status, created_at DESC);

-- Step 3: Crear tablas auth
CREATE TABLE brand_manager_users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('brand_manager','operator','admin')),
  brand_scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sign_offs (
  signoff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES brand_config_versions(version_id),
  approver_id UUID REFERENCES brand_manager_users(user_id) ON DELETE SET NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  comment TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_on_behalf_of UUID REFERENCES brand_manager_users(user_id) ON DELETE SET NULL
);

CREATE INDEX sign_offs_version_signed
  ON sign_offs (version_id, signed_at DESC);

CREATE TABLE revoked_tokens (
  token_jti TEXT PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by UUID NOT NULL REFERENCES brand_manager_users(user_id),
  reason TEXT NOT NULL CHECK (reason IN ('logout','password_change','admin_force')),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX revoked_tokens_expires ON revoked_tokens (expires_at);

CREATE TABLE auth_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('success','invalid_password','user_not_found','locked','expired_token')),
  user_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX auth_audit_email_ts ON auth_audit_log (email, timestamp DESC);
CREATE INDEX auth_audit_ts ON auth_audit_log (timestamp);

-- Step 4: GRANTS least-privilege (R-AUTH-* + SECURITY-06)
GRANT SELECT, INSERT, UPDATE ON brand_config_versions TO hermes_app;
-- ⚠️ UPDATE limitado al draft state (enforced en application layer R-BC-2)
GRANT SELECT, INSERT ON sign_offs TO hermes_app;
GRANT SELECT, INSERT, UPDATE ON brand_manager_users TO hermes_app;
-- UPDATE para failed_attempts, last_login_at, locked_until
GRANT SELECT, INSERT, DELETE ON revoked_tokens TO hermes_app;
-- DELETE para cleanup job (mismo rol; el cleanup job lo invoca a través de la app)
GRANT SELECT, INSERT ON auth_audit_log TO hermes_app;
-- Retention purge va por hermes_retention
GRANT SELECT, DELETE ON auth_audit_log TO hermes_retention;
GRANT SELECT, DELETE ON sign_offs TO hermes_retention;  -- por GDPR si compliance lo pide; MVP probablemente no se usa
GRANT SELECT, DELETE ON brand_config_versions TO hermes_retention;

-- Step 5: Seed Patprimo inicial activa (continuidad operativa post-deploy)
INSERT INTO brand_config_versions (
  version_id, brand, status,
  system_prompt, few_shot_examples,
  customer_facing_name, tone, language,
  consent_request_text, consent_denied_text, neutral_fallback_text,
  policy_version,
  author_id,
  created_at, activated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'patprimo',
  'active',
  '<system prompt seed Patprimo — copiado del Unit 1 hardcode>',
  '[]'::jsonb,  -- few-shot examples se rellenan en sign-off del primer BM real
  'Sofía de Patprimo',
  'formal_close',
  'es-CO',
  'Hola, soy Sofía de Patprimo — un asistente con IA. ¿Continuamos?',
  'Sin tu autorización no puedo procesar tu consulta. Si prefieres, te conecto con un asesor humano.',
  'Estamos teniendo un problema. ¿Algo más en lo que te pueda ayudar?',
  'patprimo-policy-v1',
  NULL,
  NOW(), NOW()
);

INSERT INTO sign_offs (
  version_id, approver_id, decision, comment, signed_at, approved_on_behalf_of
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  NULL,
  'approved',
  'Seed inicial post-Unit-2 deploy. Pendiente sign-off formal de Brand Manager Patprimo en primer review post-launch.',
  NOW(),
  NULL
);

COMMIT;
```

### 4.2 Riesgos del DROP+CREATE

- **Riesgo 1**: si hay data en `brand_configs` (Unit 1 ya en uso), se pierde. **Mitigación**: la tabla `brand_configs` de Unit 1 era stub seed; no debe haber data crítica. **Confirmar** antes de ejecutar la migration en cualquier env con uso real.
- **Riesgo 2**: foreign keys/refs hacia la tabla vieja. **Mitigación**: el grep del codebase Unit 1 muestra que solo `BrandConfigService.getActive()` la lee; cambiar la query es de 1 línea.
- **Riesgo 3**: la versión seed tiene un UUID hardcoded (`1111...`). Si dos environments diferentes lo generan con UUIDs distintos → confusión. **Mitigación**: hardcoded UUID en migration garantiza consistencia.

---

## 5. Decision log Unit 2 (tabular)

| # | Decisión | Valor | Razonamiento |
|---|---|---|---|
| TD-U2-1 | Password hashing | `bcrypt` saltRounds=12 | Q1=B; OWASP standard |
| TD-U2-2 | Password policy | min 12 chars, sin complexity (NIST 800-63B moderna) | Q2=A; 3-5 users; passphrases ok |
| TD-U2-3 | JWT lib | `jsonwebtoken` + `@fastify/jwt` | maturity + ecosystem fit |
| TD-U2-4 | JWT expiration | 8h | R-AUTH-2 |
| TD-U2-5 | Admin endpoint SLO | best-effort | Q3=A; matches Unit 1 pattern |
| TD-U2-6 | Browser support BM UI | desktop modern only (Chrome/FF/Edge/Safari × 2 latest) | Q4=A |
| TD-U2-7 | Templating engine | EJS + `@fastify/view` (tentativo, confirma NFR Design) | server-rendered min friction |
| TD-U2-8 | Frontend bundling BM UI | NONE (vanilla CSS + server-rendered) | MVP minimalism |
| TD-U2-9 | Diff lib | `diff` (server-side) | tentativo, confirma Code Gen |
| TD-U2-10 | Migration strategy brand_configs | DROP + CREATE + seed | Q5=B; tabla vieja era seed-only |

---

## 6. Open Decisions status

| OD | Tema | Status |
|---|---|---|
| OD-1 Fastify vs Express | ✅ Cerrada Inception |
| OD-2 Migrations | ✅ Cerrada Unit 1 NFR-R |
| OD-3 Bedrock SDK | ✅ Cerrada Inception |
| OD-4 Validation | ✅ Cerrada Inception |
| OD-5 Frontend widget cliente | ✅ Cerrada Unit 1 FD |
| OD-6 Tests stack | ✅ Cerrada Unit 1 NFR-R |
| OD-7 A/B Oct8ne | ⏸️ Pending Unit 3 FD |
| OD-8 CI/CD pipeline | ⏸️ Pending Build and Test |
| OD-FE-BM (nueva U2) | ✅ Cerrada acá — server-rendered EJS tentativo |

---

## 7. Security Compliance Summary (stage = Tech Stack Decisions U2)

| Rule | Aplicación |
|---|---|
| SECURITY-10 (supply chain) | bcrypt 5.x, jsonwebtoken 9.x, ejs 3.x pinneados en lockfile; npm audit en CI |
| SECURITY-12 | bcrypt 12 rounds + JWT exp 8h |
| Otros | Cubiertos en nfr-requirements.md §4 |

*No hay findings bloqueantes en este stage.*
