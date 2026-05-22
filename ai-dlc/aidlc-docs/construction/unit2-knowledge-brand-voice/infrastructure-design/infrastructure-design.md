# Infrastructure Design — Unit 2: Knowledge & Brand Voice

> **MVP scope**: solo `dev-local` environment. Delta vs Unit 1: nuevas env vars, nueva migration, BM user bootstrap CLI, BM UI assets serving, sin nuevos servicios Docker.

---

## 1. Deployment target — sin cambios

Mismo `dev-local` (Docker Compose en laptop dev). Unit 2 NO introduce nuevos environments ni nuevos containers.

---

## 2. Compute infrastructure — sin cambios

Mismos 2 containers de Unit 1:
- `hermes` (Node 20 alpine, 1 cpu / 1 GiB)
- `postgres` (Postgres 16 alpine + pgvector, 1 cpu / 1 GiB)

**Resources sizing**: la app sigue siendo I/O-bound. Las nuevas tablas + nuevos cleanup jobs son cheap. Sin necesidad de aumentar mem/cpu.

---

## 3. Storage delta — nuevas tablas

5 tablas nuevas (vivirán en el mismo volume `hermes_pg_data`):
- `brand_config_versions` (reemplaza `brand_configs` de Unit 1)
- `sign_offs`
- `brand_manager_users`
- `revoked_tokens`
- `auth_audit_log`

**Growth estimate**: <1 MB total para los primeros 6 meses (low-volume admin operations).

**Volume**: mismo `hermes_pg_data` — no se requiere volume separado.

---

## 4. Environment variables delta (nuevas en Unit 2)

| Variable | Required | Default | Source | Notas |
|---|---|---|---|---|
| `JWT_SECRET` | sí | — | `.env` | ≥32 chars random; generar con `openssl rand -hex 32` |
| `JWT_EXP_SECONDS` | no | 28800 (8h) | `.env` | configurable para tests |
| `BCRYPT_ROUNDS` | no | 12 | `.env` | configurable solo para tests (usar 4 en CI para velocidad) |
| `ADMIN_UI_ENABLED` | no | **`true`** | `.env` | Q2=A — default habilitado (MVP demo requiere acceso BM UI inmediato) |

Agregadas al Zod schema en `hermes/src/config/env.ts`.

**`.env.example` delta (sección nueva al final del archivo de Unit 1)**:

```env
# === Brand Manager / Admin (Unit 2) ===
JWT_SECRET=                        # generar con: openssl rand -hex 32
JWT_EXP_SECONDS=28800              # 8 horas
BCRYPT_ROUNDS=12
ADMIN_UI_ENABLED=true
```

---

## 5. Migration sequence completa (Unit 1 + Unit 2)

El nuevo `npm run migrate` ejecuta en orden:

| Migration | Origen | Propósito |
|---|---|---|
| `0001-init.sql` | Unit 1 | conversations, turns, tool_call_records, guardrail_events, rate_limit_buckets, schema_migrations |
| `0002-consent-log.sql` | Unit 1 | consent_log append-only |
| `0003-brand-config-seed.sql` | Unit 1 | `brand_configs` tabla seed |
| `0004-turn-log-audit.sql` | Unit 1 | turn_log_audit + pii_token_map |
| `0005-indexes.sql` | Unit 1 | indexes |
| `0006-unit2-brand-config-redesign.sql` | **Unit 2** | DROP brand_configs + CREATE brand_config_versions + tablas auth + seed Patprimo (ver tech-stack-decisions.md §4.1) |

> Hoy en MVP-fresh no hay riesgo de pérdida de data porque `brand_configs` se siembra hardcoded. Si en algún momento se deployó Unit 1 con data real en `brand_configs`, este DROP la pierde — esperado per Q5=B NFR-R.

---

## 6. BM user bootstrap CLI (Q1=B)

### 6.1 Script `npm run create-bm`

**Lives in**: `hermes/scripts/create-bm.ts`
**Invocable via**: `npm run create-bm` (alias en `package.json`)

### 6.2 Flow del script

```text
$ npm run create-bm

📝 Crear Brand Manager user

Email: bm-patprimo@pash.com.co
Password (oculto): ************
Confirm password (oculto): ************
Display name: María Brand Manager Patprimo
Role (brand_manager / operator / admin) [brand_manager]: brand_manager
Brand scopes (comma-separated; ej. patprimo,seven_seven) [patprimo]: patprimo

→ Validating...
→ Hashing password (bcrypt 12 rounds, ~250ms)...
→ Inserting into brand_manager_users...
✅ User created: a1b2c3d4-...

Para login: http://localhost:3000/admin/login
```

### 6.3 Implementación (esqueleto)

```ts
// hermes/scripts/create-bm.ts
import * as readline from 'node:readline/promises';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { env } from '../src/config/env';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const pool = new Pool({ connectionString: env.DATABASE_URL });

async function main() {
  const email = await rl.question('Email: ');
  const password = await promptPassword('Password: ');
  const confirm = await promptPassword('Confirm password: ');
  if (password !== confirm) {
    console.error('Passwords do not match');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('Password must be at least 12 chars');
    process.exit(1);
  }

  const displayName = await rl.question('Display name: ');
  const role = (await rl.question('Role [brand_manager]: ')) || 'brand_manager';
  const scopesStr = (await rl.question('Brand scopes [patprimo]: ')) || 'patprimo';
  const scopes = scopesStr.split(',').map(s => s.trim());

  const hash = await bcrypt.hash(password, 12);

  const res = await pool.query(
    `INSERT INTO brand_manager_users
       (email, password_hash, display_name, role, brand_scopes, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING user_id`,
    [email, hash, displayName, role, scopes]
  );

  console.log(`User created: ${res.rows[0].user_id}`);
  await pool.end();
  rl.close();
}

main().catch(console.error);
```

**Promptpassword** usa truco de readline para hide input (echo off).

**Detalle final del código en Code Generation Unit 2.**

---

## 7. BM UI assets serving

`@fastify/static` sirve `hermes/src/public/admin/` en path `/admin/assets/*`. Sin CDN en MVP.

```ts
fastify.register(import('@fastify/static'), {
  root: path.join(__dirname, '../public/admin'),
  prefix: '/admin/assets/',
});
```

**Estructura**:
```
hermes/src/public/admin/
├── css/
│   └── admin.css
├── js/
│   └── admin.js
└── img/
    └── logo.svg
```

**Caching**: ETag default de Fastify. Sin Cache-Control aggressive (sin invalidation strategy MVP).

---

## 8. Backup strategy (Q3=B — manual on-demand)

### 8.1 Script `npm run backup`

**Lives in**: `hermes/scripts/backup.sh` (o `.ps1` para Windows)
**Invocable via**: `npm run backup`

**Comportamiento**:
- Crea timestamped snapshot del Postgres: `hermes_pg_data_$(date +%Y%m%d_%H%M%S).sql`
- Output a `hermes/backups/` (gitignored)
- Sin compresión por simplicidad MVP

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec postgres pg_dump -U postgres -d hermes > "backups/hermes_$TIMESTAMP.sql"
echo "Backup created: backups/hermes_$TIMESTAMP.sql"
```

### 8.2 Restore (runbook)

```bash
# Restore from snapshot
docker compose down -v   # nuke current data
docker compose up -d postgres
sleep 5
docker compose exec -T postgres psql -U postgres -d hermes < backups/hermes_<timestamp>.sql
docker compose up -d hermes
```

### 8.3 Runbook para Demo Day

1. Día anterior al Demo Day: `npm run backup` y verificar el archivo existe.
2. Si demo se rompe mid-show: NO restorar mid-show (slow); rollback a Oct8ne si es producción A/B.
3. Post-demo: `npm run backup` para preservar el estado del demo.

---

## 9. Networking — sin cambios

Mismos port bindings (`127.0.0.1` only) de Unit 1. Las rutas `/admin/*` están en el mismo puerto 3000.

**CORS** delta:
- Las rutas `/admin/*` permiten origin del laptop dev (`http://localhost:3000`) y eventualmente el host de producción.
- Diferenciado de las rutas `/chat` (que aceptan `https://patprimo.com.co`).
- Configurado en el plugin CORS con per-route override si fuera necesario.

---

## 10. Monitoring delta

- `pino` logger captura nuevos eventos (login attempts, brand_config state changes).
- Sin nuevas dashboards en MVP — `docker compose logs hermes` sigue siendo la herramienta principal.

---

## 11. Resource sizing — sin cambios

Mismo budget que Unit 1: ~4 GiB RAM laptop dev.

---

## 12. Updates a npm scripts

Adiciones al `hermes/package.json`:

```json
{
  "scripts": {
    // ... existing Unit 1 scripts ...
    "create-bm": "tsx scripts/create-bm.ts",
    "backup": "bash scripts/backup.sh",
    "restore": "bash scripts/restore.sh"
  }
}
```

> `tsx` permite ejecutar TypeScript sin build step (para scripts). Ya está en devDependencies de Unit 1.

---

## 13. Out-of-scope (MVP)

- ❌ Staging / prod environments
- ❌ Backup automation (cron, S3 sync)
- ❌ CDN para BM UI assets
- ❌ Monitoring centralizado (admin events)
- ❌ Secrets rotation runbook (manual = re-deploy)
- ❌ Multi-instance BM UI

---

## 14. Security Compliance Summary

| Rule | Status | Implementación |
|---|---|---|
| SECURITY-06 | Aplicado | Grants delta en migration 0006 ya documentados (hermes_app + hermes_retention) |
| SECURITY-09 | Aplicado | `npm run create-bm` no acepta defaults inseguros; min 12 chars enforced |
| SECURITY-10 | Aplicado | Nuevas libs pinneadas en lockfile (TD-U2-1..3) |
| SECURITY-12 | Aplicado | Password input oculto (echo off) en CLI; bcrypt al insertar; sin logs del plaintext |
| Otros | Cubiertos en stages anteriores | — |

*No hay findings bloqueantes en este stage.*
