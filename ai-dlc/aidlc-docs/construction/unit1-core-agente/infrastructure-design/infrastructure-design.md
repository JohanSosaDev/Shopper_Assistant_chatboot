# Infrastructure Design — Unit 1: Core Agente

> **MVP scope**: solo environment local Docker Compose. Staging/prod queda como roadmap Fase 2 (sin spec).

---

## 1. Deployment target

**Único environment en MVP**: `dev-local` (Docker Compose en el laptop del desarrollador).

- **Cloud provider real (Bedrock, SFCC)**: AWS Bedrock + SFCC OCAPI/SCAPI accedidos vía internet desde el laptop.
- **Sin VPC, sin networking en AWS** para Hermes mismo en MVP.
- **Fase 2**: AWS-hosted (Lambda vs ECS Fargate, RDS, CloudFront) — sin spec en este documento.

---

## 2. Compute infrastructure

### 2.1 Hermes app container

| Aspecto | Valor |
|---|---|
| Base image | `node:20.18-alpine` (multistage build) |
| Runtime | Node.js 20 LTS |
| Image tag | `hermes:dev-local` (built localmente) |
| CPU | 1.0 cpus (Docker limit) |
| Memory | 1 GiB (Docker limit) |
| Restart policy | `unless-stopped` |
| Healthcheck | `curl -f http://localhost:3000/health/ready` cada 30s, 5s timeout, 3 retries |

### 2.2 Postgres container

| Aspecto | Valor |
|---|---|
| Image | `postgres:16-alpine` (con extensión pgvector instalada vía init script) |
| CPU | 1.0 cpus |
| Memory | 1 GiB |
| Restart policy | `unless-stopped` |
| Healthcheck | `pg_isready -U postgres` cada 30s |
| Init script | `postgres-init.sql` (crea extension pgvector + roles `hermes_app` y `hermes_retention`) |

---

## 3. Storage infrastructure

### 3.1 Postgres data volume

```yaml
volumes:
  hermes_pg_data:
    driver: local
```

- Persistencia local en el host (volumen Docker named).
- **Sin backup automatizado** (Q4=C). Si el volumen se pierde, `npm run seed` regenera datos.

### 3.2 No object storage en MVP
- Sin S3, sin alternativas. El widget `widget.js` y `widget.css` se sirven directamente desde Fastify (Unit 1 endpoint `GET /widget/*`).

---

## 4. Messaging infrastructure

**No aplica.** Sin Redis, sin queue (Q4=A NFR Design). Background jobs corren in-process con `node-cron`.

---

## 5. Networking infrastructure

### 5.1 Docker Compose network

- Network interna por default Docker Compose (`bridge`).
- Servicios se referencian por nombre dentro de la network (`postgres`, `hermes`).

### 5.2 Port mapping al host

| Container | Container port | Host port | Exposición |
|---|---|---|---|
| `hermes` | 3000 | 3000 | localhost only (`127.0.0.1:3000:3000`) |
| `postgres` | 5432 | 5432 | localhost only (`127.0.0.1:5432:5432`) |

**Justificación**: binding a `127.0.0.1` solo (no `0.0.0.0`) previene exposición accidental en redes WiFi públicas.

### 5.3 External egress

- Outbound HTTPS a AWS Bedrock (`*.amazonaws.com` puerto 443) y a SFCC OCAPI/SCAPI (host configurable).
- Sin restricciones — el laptop opera con cualquier internet disponible.

### 5.4 CORS

- Configurado en Fastify con allowlist `ALLOWED_ORIGINS` env var.
- Para demo local: incluir `http://localhost:*` y el host real de patprimo.com.co staging.

---

## 6. AWS Bedrock configuration

### 6.1 Region (Q1=C — TBD, configurable)

```env
BEDROCK_REGION=sa-east-1   # default LATAM (São Paulo); verificar Claude Haiku 4.5 disponibilidad
```

**Fallback documentado**: si `sa-east-1` no soporta el modelo en momento del MVP:
```env
BEDROCK_REGION=us-east-1
```
Y agregar en el consent text del bot la mención de transferencia internacional explícita (Habeas Data).

### 6.2 Model ID

```env
BEDROCK_MODEL_ID=anthropic.claude-haiku-4-5:0
```

### 6.3 Authentication

- AWS IAM access keys vía env vars (`.env` local, gitignored).
- En Fase 2: IAM role asociado a la compute (Lambda/ECS) sin keys explícitas.

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

### 6.4 Quota

- Coordinar con el AWS account holder de PASH la cuota TPM/RPM disponible.
- Para MVP demo (≤50 conv simultáneas): cualquier tier estándar basta.
- Para Fase 2 con tráfico real: solicitar provisioned throughput si latencia o cuota son problema.

---

## 7. SFCC configuration

### 7.1 OCAPI/SCAPI access

```env
SFCC_BASE_URL=https://<merchant>.demandware.net   # placeholder a confirmar con equipo IT PASH
SFCC_CLIENT_ID=<oauth_client_id>
SFCC_CLIENT_SECRET=<oauth_client_secret>
```

**Coordinación con IT PASH**:
- Solicitar OAuth client con scopes mínimos: `sfcc.orders.rw` (o equivalente) + read-only inventario en Fase 2.
- Confirmar endpoint del OMS para `get_order_status`.
- Confirmar quota — el bot llamará a OMS por cada turn con intención `order_status`.

### 7.2 Tokens

- Token cache in-memory por proceso, refresh proactivo 5 min antes de expiry.
- Si SFCC retorna 401 mid-turn → invalidar cache + 1 retry con token fresh.

---

## 8. Monitoring infrastructure (MVP)

### 8.1 Logs
- `pino` JSON structured → stdout.
- `docker compose logs hermes` captura.
- Sin centralización (CloudWatch / DataDog) en MVP.

### 8.2 Métricas
- Vivien en `turn_log_audit` (Postgres) — queries SQL ad-hoc.
- Sin Prometheus / Grafana en MVP.

### 8.3 Alertas
- **Sin alertas formales en Unit 1**.
- Se implementan en Unit 3 (`AlertingService`) con destinos configurables (stdout para MVP, Slack/email para Fase 2).

---

## 9. Shared infrastructure

**No aplica para MVP**: Hermes es single-app, single-tenant (Patprimo Col).

---

## 10. Environment matrix (Q2=A — solo MVP local)

| Env | Status | Notas |
|---|---|---|
| `dev-local` | ✅ Definido | Único en MVP. Docker Compose en laptop. |
| `staging` | ⏸️ Out-of-scope MVP | Spec en Fase 2 (probable: EC2 t3.medium + RDS db.t3.micro single-AZ) |
| `prod` | ⏸️ Out-of-scope MVP | Spec en Fase 2 (probable: ECS Fargate + RDS Multi-AZ + ALB) |

---

## 11. Provisioning automation (Q3=C — npm scripts)

`hermes/package.json` exporta los siguientes scripts:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "up": "docker compose up -d",
    "down": "docker compose down",
    "logs": "docker compose logs -f hermes",
    "migrate": "docker compose exec hermes node dist/migrate.js",
    "seed": "docker compose exec hermes node dist/seed.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write src/",
    "rebuild": "docker compose build --no-cache hermes"
  }
}
```

**Quick start documentado** (para `README.md`):
```bash
cp .env.example .env       # configurar secrets
npm install                # instalar deps locales para lint/test
npm run up                 # docker compose up -d (build + start)
npm run migrate            # corre migrations
npm run seed               # carga seed (brand config Patprimo + sample data)
npm run logs               # tail de la app
```

---

## 12. Security infrastructure

### 12.1 Secrets management (MVP)

- `.env` (gitignored) con todos los secrets locales.
- `.env.example` (committed) con keys vacíos + comentarios.
- **NO** committear `.env` real bajo ninguna circunstancia.
- Para Fase 2: AWS Secrets Manager.

### 12.2 Postgres roles (de NFR §4.2)

Init script `postgres-init.sql`:

```sql
-- Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Roles
CREATE ROLE hermes_app WITH LOGIN PASSWORD :'app_password';
CREATE ROLE hermes_retention WITH LOGIN PASSWORD :'retention_password';

-- Permissions granted post-migration via migration files
-- (see migrations/0001-init.sql for GRANT statements)
```

### 12.3 TLS

- **En MVP local**: comunicación interna Docker Compose sin TLS (red privada Docker). HTTPS solo en outbound a Bedrock y SFCC.
- **Fase 2**: TLS interno con RDS + ACM certs + ALB termination.

---

## 13. Resource sizing summary

| Recurso | Allocated | Justificación |
|---|---|---|
| Hermes app: CPU | 1.0 | Single-process Node, I/O-bound, 50 conv concurrentes |
| Hermes app: RAM | 1 GiB | Suficiente para Node + pg pool + 50 conv state in-memory |
| Postgres: CPU | 1.0 | Schema pequeño, 50 conv, queries simples |
| Postgres: RAM | 1 GiB | Shared buffers default + cache ops |
| Disk (volume) | ~5 GiB esperado | Solo growth from turn_log_audit |

**Total laptop dev requirement**: ~4 GiB RAM + 2 cores libres para Docker. Cualquier laptop dev moderno cabe.

---

## 14. Out-of-scope (MVP)

- ❌ Staging / prod environments
- ❌ AWS networking (VPC, subnets, security groups)
- ❌ Load balancer / API gateway
- ❌ CDN para widget
- ❌ Monitoring centralizado (CloudWatch, Prometheus)
- ❌ Alerting infra (Slack webhooks, PagerDuty)
- ❌ Backup automation
- ❌ Multi-region / DR
- ❌ Kubernetes / EKS

Todos pasan a Fase 2.

---

## 15. Security Compliance Summary

| Rule | Status | Implementación |
|---|---|---|
| SECURITY-01 | Parcial MVP | HTTPS outbound a Bedrock/SFCC; Postgres local sin TLS interno aceptable; Fase 2 con RDS encrypted |
| SECURITY-02 | N/A MVP | Sin load balancer/API gateway |
| SECURITY-06 | Aplicado | §12.2 roles least-priv |
| SECURITY-07 | Aplicado | §5.2 port binding a `127.0.0.1` only |
| SECURITY-09 | Aplicado | §12.1 no default credentials, `.env` mandatory |
| SECURITY-10 | Aplicado | §2.1, §2.2 versiones pinneadas (`node:20.18-alpine`, `postgres:16-alpine`) |
| SECURITY-12 | Aplicado parcial | §12.1 secrets en `.env` local, NO en código |
| Otros | Cubiertos en NFR Design | — |

*No hay findings bloqueantes en este stage.*
