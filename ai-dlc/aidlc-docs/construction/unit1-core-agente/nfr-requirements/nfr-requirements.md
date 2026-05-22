# NFR Requirements — Unit 1: Core Agente

> **Filosofía**: MVP demo-focused. Estamos en semana 2/4 + estación 5/12. Las NFRs prioritizan correctness y compliance no-negotiable; relegan capacity stress y testing exhaustivo a Fase 2.

---

## 1. Performance

### 1.1 Latency targets (only `/chat` carries SLO en MVP, per Q2=B)

| Endpoint | SLO | Notas |
|---|---|---|
| `POST /chat` | **p50 <30s · p95 <60s** | Único SLO formal en MVP. Carga el budget completo del LLM (Bedrock) + tool call SFCC. |
| `GET /ab/decide` | best-effort | Stateless, debería responder <100ms en práctica pero no auditado. |
| `GET /health` | best-effort | Debería responder <50ms; usado por Docker healthcheck. |
| `GET /widget/config` | best-effort | Pre-cacheable; <200ms aceptable. |

### 1.2 Throughput

- **No target formal** — capacidad **steady state 50 conv simultáneas** (per Q1=C) sin pico distinguido.
- Si se excede → rate limiting (R-RATE-2, R-RATE-3) entra en acción; no se busca absorber picos.
- **Load testing**: out of scope MVP. Validación de throughput = demo manual + métricas observadas en producción A/B.

### 1.3 Optimization priorities

1. **Latency del path crítico** (`/chat`): perfil LLM call + tool call. Si excede p95 60s consistentemente → degradar respuesta a fallback neutral.
2. **Memory footprint**: <512 MB por proceso Node objetivo (cabe en 1 GB container).
3. **CPU**: single-process Node sin worker threads en MVP. Si se necesita escalar → Fase 2.

---

## 2. Scalability

### 2.1 MVP scope
- **Vertical scaling solo** — 1 instancia Fastify, 1 instancia Postgres, ambas en Docker Compose.
- **No auto-scaling, no horizontal scaling, no load balancer**. Demo-focused.

### 2.2 Forward-looking hints (no implementar en MVP)
- Documentar dónde estaría el cuello de botella si escala horizontal: la `pii_token_map` y `turn_log_audit` requerirían partitioning por fecha; el rate limiter requeriría store compartido (Redis o Postgres con sliding window).
- Bedrock LATAM tiene sus propios rate limits (TPM/RPM) — coordinar quota con AWS account ya en Fase 2.

---

## 3. Availability

### 3.1 MVP target
- **99% uptime objetivo demo** = ~7h downtime aceptable por mes en operación, pero zero downtime aceptable durante demos programadas.
- **Sin SLA contractual** — es MVP de programa, no producto contractual.

### 3.2 Recovery
- **RPO**: las conversaciones se pierden si Postgres se cae sin backup; aceptable en MVP. Consent_log no se pierde porque es append-only persistido sincrónico.
- **RTO**: con `docker-compose up` el sistema vuelve en <2 minutos.
- **Backups MVP**: snapshot diario de Postgres a archivo local (script `pg_dump` en cron del host). Backup formal AWS-grade → Fase 2.

### 3.3 Health checks
- `/health` liveness: respond 200 si proceso está vivo.
- `/health/ready` readiness: respond 200 si Postgres + Bedrock client están alcanzables (test connectivity).
- Docker `healthcheck: ["CMD", "curl", "-f", "http://localhost:3000/health/ready"]`.

---

## 4. Security (extension Security Baseline activa)

Cumplimiento de las 15 reglas SECURITY que aplican a Unit 1. Detalle por regla:

| Rule | Status | Implementación en Unit 1 |
|---|---|---|
| SECURITY-01 (encryption at rest + in transit) | Aplicado parcial | Postgres con TLS habilitado en producción (Fase 2); MVP local Docker Compose sin TLS interno aceptable. PII anonimizada al log compensa. |
| SECURITY-02 (access logging) | N/A MVP | No hay load balancer ni API gateway en local-only. Aplica en Fase 2. |
| SECURITY-03 (application logging) | Aplicado | pino estructurado JSON; correlation_id por request (CC-3); PII anonimizada (R-PII-4). |
| SECURITY-04 (HTTP security headers) | Aplicado parcial | `@fastify/helmet` agregando CSP, HSTS, X-Content-Type-Options, X-Frame-Options al middleware HTTP. Aplica a páginas servidas; en MVP no servimos HTML directamente desde Hermes (el widget es bundle JS embebido en SFCC) — aún así, los headers van. |
| SECURITY-05 (input validation) | Aplicado | Zod en cada controller (Step 1 parseRequest); max length 4000 chars enforced. |
| SECURITY-06 (least privilege) | Aplicado | Postgres role `hermes_app` solo tiene INSERT en `turn_log_audit` y `consent_log`; separate role `hermes_retention` para purga. |
| SECURITY-07 (restrictive network) | N/A MVP | Docker Compose interno; bind ports solo expuestos al host. Aplica en Fase 2. |
| SECURITY-08 (app-level access control) | Aplicado parcial | `/chat` público (consent gate hace su trabajo); admin endpoints en Unit 2/3 — auth middleware se diseña ahí. CORS restricted a `https://patprimo.com.co` (configurable). |
| SECURITY-09 (hardening) | Aplicado | No default credentials; error responses genéricas (R-ERR-2); no directory listing (Fastify no expone). |
| SECURITY-10 (supply chain) | Aplicado | `package-lock.json` committed; `npm audit` corre en CI; sin `:latest` tags en Dockerfile (versiones pinneadas Node 20 LTS + Postgres 16). |
| SECURITY-11 (secure design) | Aplicado | M6 aislado; rate limiting en `/chat`; defense-in-depth con input + output guardrails. |
| SECURITY-12 (auth + credentials) | Aplicado parcial | No hay login de cliente en MVP (es chat público con consent). Para admin (Unit 2/3): JWT validation server-side + secrets en env vars (`.env.example` sin secrets reales). |
| SECURITY-13 (data integrity) | Aplicado | Append-only `turn_log_audit` y `consent_log` enforced vía permisos DB. Datos críticos (consent) inmutables. |
| SECURITY-14 (alerting + monitoring) | Aplicado | Retención 90d en Postgres enforced via `retention.job` (Q5=C). Alertas básicas en logs (pino stdout); alertas formales (Slack/email) → Unit 3 con AlertingService. |
| SECURITY-15 (exception handling) | Aplicado | CC-2 global error handler + R-ERR-1..4 fail-closed defaults. |

### 4.1 Threat model (resumen)
| Threat | Mitigación |
|---|---|
| Prompt injection / jailbreak | Input + output guardrails (R-GUARD-IN/OUT) + red team pre-launch ≥30 attacks ≥95% rechazo |
| PII leak en logs | Anonymization obligatoria (R-PII-1..5) + tipo `RedactedText` en signatures |
| Enumeration attack sobre orderId | Respuesta genérica indistinguible (R-ID-2) |
| Cost DoS via tokens | Token budget per turn + rate limits multi-nivel (R-RATE-1..3) |
| SQL injection | `pg` parameterized queries obligatorias (regla código + lint) |
| Stale brand config | Snapshot at conversation start (Conversation.brand_config_version) |

---

## 5. Reliability

### 5.1 Error budget
- 1% error budget mensual (alineado con 99% uptime).
- Errores categorizados (R-ERR-4):
  - **Recoverable**: tool transient, LLM rate limit → retry
  - **Non-recoverable**: validation, auth, PII critical → fail-closed inmediato

### 5.2 Fault tolerance
- **Circuit breaker** en cada tool call (R-TOOL-2): 5 fallos → abrir 30s.
- **Retry**: max 3 con exponential backoff (R-TOOL-1).
- **Timeout**: 10s por tool call individual (R-TOOL-3).
- **Bedrock unreachable**: bot responde con fallback + alerta a Operador (futuro Unit 3); el cliente puede pedir handoff humano (botón presente como placeholder en Unit 1, activo en Unit 3).

### 5.3 Monitoring + alerting (MVP)
- pino estructurado JSON a stdout (Q5=C).
- Métricas básicas en `turn_log_audit` (Postgres) para queries ad-hoc.
- **Alertas formales (Slack/email) NO se implementan en Unit 1** — eso es Unit 3 con AlertingService.
- En MVP: tail de stdout durante demo + queries SQL post-demo para post-mortem.

---

## 6. Maintainability

### 6.1 Code quality
- TypeScript strict mode obligatorio.
- ESLint con reglas opinadas + `@typescript-eslint/recommended`.
- Prettier para format.
- Pre-commit hooks vía `lefthook` o `husky` (decidir en Code Generation).

### 6.2 Testing (Q4=B)
- **Stack**: Vitest (unit + integration) + Supertest (HTTP integration). **Sin Playwright en MVP**.
- **Coverage target**: 70% lines en código de negocio (services/, lib/, tools/, guardrails/).
  - **Sin branches coverage** explícito — agregar 1–2 días de testing defensivo no justifica en MVP.
- **PBT extension enabled**: aplicar property-based testing a:
  - `anonymizePII` (round-trips, no leaks)
  - Tool input validators (Zod schemas + edge cases)
  - Rate limiter (concurrency stress)
  - Guardrail pattern matchers (false positive/negative rates)
- **E2E del widget**: validación manual durante demo. Si se invierte tiempo extra → Playwright en Fase 2.

### 6.3 Documentation
- Inline JSDoc solo para "por qué" (no para "qué hace" — el código + tipos lo dicen).
- READMEs por carpeta principal (`services/`, `tools/`, `prompts/`) con 1 párrafo de contexto.
- AI-DLC docs (`aidlc-docs/`) son la fuente de verdad arquitectónica.

---

## 7. Usability (frontend widget — referenciar FD frontend-components.md)

- Accesibilidad mínima MVP: WCAG AA en contraste; focus trap en widget; aria-labels en CTAs.
- Mobile-first (70% del tráfico Patprimo Col es mobile).
- Performance budget widget: ≤30 KB gzipped JS + ≤5 KB CSS.

---

## 8. NFR-to-Story traceability

| Story | NFR covered |
|---|---|
| E1-S1 saludo + consent | Performance latency (consent prompt <2s render); SECURITY-15 fail-closed si consent flow rompe |
| E1-S2 identificación dual | SECURITY-08 access control (anti-enumeration R-ID-2); SECURITY-05 input validation |
| E1-S3 tool call | Performance p50 <30s; Reliability circuit breaker + retry |
| E1-S4 voz Patprimo | Performance latency LLM; Maintainability seed config bootstrap |
| E1-S5 guardrails | Security threat model (prompt injection); red team pre-launch |
| E1-S6 logging | SECURITY-03, 13, 14 (append-only, retention 90d) |
| E2-S4 Fase 0 baseline | Maintainability + Reliability (baseline para post-deploy comparison) |

---

## 9. Out-of-scope NFRs (MVP)

Para tener trazabilidad de lo que NO se hace:

- ❌ Load testing formal (k6, artillery, etc.)
- ❌ Chaos engineering / fault injection
- ❌ Distributed tracing (Jaeger, OpenTelemetry) — pino + correlation_id basta MVP
- ❌ A11y automated tests (axe-core) — manual review basta MVP
- ❌ Penetration testing externo — red team manual basta MVP
- ❌ Multi-region failover — single deploy LATAM
- ❌ Disaster recovery plan formal — backup diario + redeploy script

Todos pasan a Fase 2.

---

## 10. Security Compliance Summary (stage = NFR Requirements)

| Rule | Status | Notas |
|---|---|---|
| SECURITY-01..15 | Documentados en §4 | Cada una con status MVP-relevante. Las marcadas N/A MVP se justifican (load balancer, network) — aplican en Fase 2. Las aplicadas tienen plan concreto. |

*No hay findings bloqueantes en este stage.*
