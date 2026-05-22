# NFR Design Patterns — Unit 1: Core Agente

> **Filosofía MVP**: minimizar moving parts. Reusar lo que ya existe (R-TOOL-*, R-RATE-*, R-ERR-* de business-rules.md). Solo agregar lo estrictamente necesario.

---

## 1. Resilience Patterns

### 1.1 Retry with exponential backoff (unified helper)

**Pattern**: helper único `withRetry<T>(fn, opts)` aplicado a TODOS los outbound calls (SFCC tools + Bedrock).

**Implementación lógica:**
```ts
// hermes/src/lib/retry.ts
interface RetryOptions {
  maxAttempts: number;        // default 3
  baseDelayMs: number;        // default 100
  factor: number;             // default 5 (100 → 500 → 2500)
  retryableErrors: (err: unknown) => boolean;
}

async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T>
```

**Aplicación:**
| Outbound | maxAttempts | retryable |
|---|---|---|
| SFCC tool calls (`get_order_status`) | 3 | timeout, 5xx, network |
| Bedrock invocations | 3 | throttle (429), 5xx, network |
| Postgres queries | 0 | retry no aplica — fail-closed |

**Justificación Q1=A**: consistencia evita duplicar lógica. Un solo bug en retry afecta una sola superficie. Bedrock LATAM con throttling esporádico se beneficia del mismo backoff que SFCC.

### 1.2 Circuit Breaker

**Pattern**: helper `withCircuitBreaker<T>(name, fn, opts)` que mantiene estado por nombre del breaker.

**Implementación lógica:**
```ts
// hermes/src/lib/circuit-breaker.ts
interface BreakerOptions {
  failureThreshold: number;   // 5 fallos consecutivos
  openMs: number;              // 30000 (30s ventana abierta)
  halfOpenMaxAttempts: number; // 1
}

async function withCircuitBreaker<T>(name: string, fn: () => Promise<T>, opts: BreakerOptions): Promise<T>
```

**Estados**: `closed` (normal) → `open` (rechazo inmediato) → `half-open` (1 probe) → `closed` o `open`.

**Storage**: in-memory (Map<string, BreakerState>) — single-process suficiente MVP. Si Fase 2 escala horizontal → Redis.

**Aplicación:**
| Breaker name | failureThreshold | openMs |
|---|---|---|
| `sfcc.get_order_status` | 5 | 30000 |
| `bedrock.invoke` | 5 | 30000 |

### 1.3 Timeout

**Pattern**: cada outbound call envuelto en `Promise.race([fn(), timeout(ms)])`.

| Operación | Timeout |
|---|---|
| SFCC tool individual | 10s |
| Bedrock invoke | 30s (tolerante a LLM lento) |
| Postgres query | 5s (default `pg` statement_timeout) |

### 1.4 Fail-Closed

**Pattern**: cualquier error no-recuperable → response neutral al cliente + log + alert (alert formal Unit 3).

Implementación en CC-2 Global Error Handler — clasifica errores por tipo y mapea a HTTP status + response body.

---

## 2. Performance Patterns

### 2.1 Connection pooling (defaults — Q3=A)

| Recurso | Configuración | Razonamiento |
|---|---|---|
| Postgres pool | `pg` default `max=10` | 50 conv simultáneas × turn duration <30s → ratio 5:1, holgura amplia |
| `undici` HTTP keep-alive | default (`Pool` reutiliza sockets) | tunear sin métricas = premature opt |
| Bedrock SDK | default (SDK maneja interno) | sin razón para overrride |

### 2.2 Single-process Node async I/O

**Pattern**: Node 20 event loop maneja toda la concurrencia. **No worker threads** en MVP.

**Justificación**: las 50 conv simultáneas son I/O-bound (LLM + DB + HTTP), no CPU-bound. Node mono-threaded es óptimo para este shape de carga.

**Limit**: si Fase 2 introduce procesamiento CPU-intensivo (ej. embeddings locales) → re-evaluar con worker threads o servicio dedicado.

### 2.3 No-cache strategy (Q2=A)

**Decisión**: cero capas de cache en MVP.

| Recurso | Estrategia | Razonamiento |
|---|---|---|
| Brand config | en memoria (TS module export) | seed hardcoded en Unit 1; ya está en memoria sin esfuerzo |
| `/widget/config` | servido directo desde el módulo | <50ms sin cache; agregar cache = más bugs |
| Tool results | NO cachear | datos en vivo = el sentido del bot |
| Static assets widget | servido por Fastify con `etag` | Fastify lo hace por default |

**Si Fase 2 introduce RAG denso (M2 real)**: ahí sí se necesitará caching layer — fuera de scope MVP.

### 2.4 LLM token budget enforcement

**Pattern** (ya R-RATE-1): `max_tokens` parameter en cada invocación Bedrock = 2000. SDK enforza el cap.

Adicional: si la respuesta truncada < 100 tokens, considerarla inválida → fallback neutral (defensa contra LLM stuck en loop).

---

## 3. Scalability Patterns

### 3.1 Vertical scaling only (MVP)

**Pattern**: 1 proceso Node + 1 instancia Postgres. Resources alocados via Docker Compose.

```yaml
# docker-compose.yml (extracto)
services:
  hermes:
    mem_limit: 1g
    cpus: 1.0
  postgres:
    mem_limit: 1g
    cpus: 1.0
```

**Forward-looking**: Documentar en `logical-components.md` los pivots horizontales para Fase 2 (mover rate limit a Redis, mover jobs a worker dedicado, etc.).

### 3.2 Database scalability hints

- **Append-only tables** (`turn_log_audit`, `consent_log`, `pii_token_map`) van a crecer rápido. Preparar índices apropiados desde Unit 1 (timestamp + conversation_id).
- **Partition strategy futuro**: por mes en `turn_log_audit` — NO se implementa en MVP, pero el schema (timestamp first column) lo facilita.

---

## 4. Security Patterns

### 4.1 Defense-in-depth en input/output (ya en business-rules.md §3, §4)

**Pattern**: 2 capas de guardrails (input + output) — Q4 de FD = C.

Reforzado aquí: cada capa **NO depende** de la otra (la siguiente capa asume que la anterior pudo fallar).

### 4.2 Least-privilege en Postgres (SECURITY-06)

**Pattern**: 2 roles distintos.

```sql
-- Role para app (runtime)
CREATE ROLE hermes_app WITH LOGIN PASSWORD :'app_password';
GRANT SELECT, INSERT ON conversations, turns, consent_log, brand_configs TO hermes_app;
GRANT SELECT, INSERT ON turn_log_audit TO hermes_app;
-- ❌ NO UPDATE / NO DELETE sobre append-only tables

-- Role para retention/forget jobs (separation of duties)
CREATE ROLE hermes_retention WITH LOGIN PASSWORD :'retention_password';
GRANT SELECT, DELETE ON turn_log_audit TO hermes_retention;
GRANT SELECT, DELETE ON consent_log TO hermes_retention;
```

**Justificación SECURITY-06, SECURITY-13**: si el código de la app es comprometido, NO puede borrar logs auditables. Solo el rol especial (que corre el job de retention/forget) puede.

### 4.3 Environment validation fail-fast (SECURITY-09)

**Pattern**: `hermes/src/config/env.ts` valida con Zod al startup. Si invalid → `process.exit(1)` antes de bind del port.

```ts
// hermes/src/config/env.ts
const env = envSchema.parse(process.env);  // throws si invalid
// Si llega acá, env está garantizado válido para el resto del proceso.
export { env };
```

**Justificación SECURITY-12**: secrets ausentes hacen fail inmediato. No degrada silencioso ni crash en producción tardíamente.

### 4.4 HTTP security headers (SECURITY-04)

**Pattern**: `@fastify/helmet` con configuración:

```ts
fastify.register(helmet, {
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] }},
  hsts: { maxAge: 31536000, includeSubDomains: true },
  // X-Content-Type-Options: nosniff (default)
  // Referrer-Policy: strict-origin-when-cross-origin (default)
});
```

### 4.5 Rate limiting via `@fastify/rate-limit`

**Pattern** (ya R-RATE-2, R-RATE-3): 30 req/min/IP en `/chat`, 10 turns/min/conversation. Storage: Postgres (TD-9 — sin Redis MVP).

```ts
fastify.register(rateLimit, {
  max: 30, timeWindow: '1 minute',
  keyGenerator: req => req.ip,
  // Storage adapter custom → Postgres
});
```

**Justificación Q4=A**: storage en Postgres aceptable a 50 conv concurrentes; introducir Redis = +1 servicio Docker sin justificación métrica.

### 4.6 CORS restrictive (SECURITY-08)

```ts
fastify.register(cors, {
  origin: env.ALLOWED_ORIGINS.split(','),  // strict allowlist
  credentials: true,
});
```

---

## 5. Reliability Patterns

### 5.1 Idempotency en turn submission

**Pattern**: cada `POST /chat` incluye un `turn_id` UUID generado client-side. Si el mismo `turn_id` llega dos veces (retry de la red), el servidor reconoce duplicate y retorna el resultado cached del primer attempt (solo dentro de una ventana de 5 min).

**Trade-off MVP**: agregar idempotency adds ~0.5 día. **Decisión**: NO incluir en Unit 1; aceptar riesgo de doble respuesta como degraded UX. Reconsiderar si bug reportado en testing.

### 5.2 Health checks

| Endpoint | Comportamiento |
|---|---|
| `GET /health` | retorna 200 + `{"status":"ok"}` si proceso está vivo (no checks externos) |
| `GET /health/ready` | retorna 200 si Postgres alcanzable + Bedrock client inicializable; sino 503 |

**Justificación**: Docker `healthcheck` usa `/health/ready` para readiness; load balancer (Fase 2) usaría `/health` para liveness.

### 5.3 Graceful shutdown

**Pattern**: capturar `SIGTERM` / `SIGINT`, esperar a que conexiones HTTP en vuelo terminen (con timeout 10s), cerrar pg pool, exit 0.

```ts
process.on('SIGTERM', async () => {
  await fastify.close();    // espera handlers in-flight
  await pgPool.end();       // cierra DB
  process.exit(0);
});
```

---

## 6. Maintainability Patterns

### 6.1 Structured logging con correlation_id

**Pattern** (ya en CC-3 Request Context): cada request lleva `request_id` UUID generado por hook `onRequest`. Cada log line del request lleva ese `request_id`.

```ts
fastify.addHook('onRequest', (req, _reply, done) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  done();
});
```

### 6.2 Error class hierarchy

**Pattern**: clase base `HermesError` con sub-classes tipadas. CC-2 mapea cada clase a HTTP status + log severity.

```ts
class HermesError extends Error { httpStatus: number; logSeverity: 'low' | 'medium' | 'high'; }
class ValidationError extends HermesError { httpStatus = 400; logSeverity = 'low'; }
class ConsentRequiredError extends HermesError { httpStatus = 200; logSeverity = 'low'; } // not really an error, controlled flow
class ToolUnavailableError extends HermesError { httpStatus = 503; logSeverity = 'high'; }
class GuardrailBlockError extends HermesError { httpStatus = 200; logSeverity = 'medium'; }
class InternalError extends HermesError { httpStatus = 500; logSeverity = 'high'; }
```

### 6.3 Branded types para safety

**Pattern**: types branded para semantics que TS no puede inferir.

```ts
type CustomerIdHash = string & { readonly __brand: 'CustomerIdHash' };
type RedactedText = string & { readonly __brand: 'RedactedText' };
type ConversationId = string & { readonly __brand: 'ConversationId' };

function anonymizePII(text: string): RedactedText;  // forces que sólo retorne redacted
function logTurn(record: { outputTextRedacted: RedactedText, ... }): Promise<void>;
```

**Justificación SECURITY-03**: el compilador previene `logTurn({ outputTextRedacted: rawCustomerText })` — compilation error.

---

## 7. Observability patterns

### 7.1 Pino structured logging + correlation

**Config** (de TD-8):
```ts
const logger = pino({
  level: env.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: ['req.headers.authorization', '*.password', '*.secret'],
    censor: '<REDACTED>',
  },
});
```

Pino redact protege contra leak accidental de auth tokens en logs estructurados.

### 7.2 Turn lifecycle tracking en `turn_log_audit`

**Pattern**: cada turn registra timing en cada step del pipeline (`ctx.stepTimings`). Permite drill-down de latencia por step en MVP sin tools externas.

```ts
ctx.stepTimings = {
  parseRequest: 5,
  resolveIdentity: 12,
  consentGate: 8,
  // ...
  bedrockInvoke: 12340,  // here lives most of the latency
  outputGuardrails: 15,
  total: 12450,
};
```

Stored en `turn_log_audit.step_timings_jsonb` para queries ad-hoc.

---

## 8. Security Compliance Summary

| Rule | Pattern aplicado |
|---|---|
| SECURITY-01 | TLS in transit a Bedrock y SFCC (HTTPS); Postgres TLS en Fase 2 |
| SECURITY-03 | §6.1 + §7.1 pino structured + correlation_id |
| SECURITY-04 | §4.4 `@fastify/helmet` |
| SECURITY-05 | §6.3 branded types + Zod en boundary |
| SECURITY-06 | §4.2 roles `hermes_app` + `hermes_retention` |
| SECURITY-08 | §4.6 CORS restrictive + consent gate (FD §3) |
| SECURITY-09 | §4.3 env fail-fast + R-ERR-2 generic errors |
| SECURITY-11 | §1, §2, §4 defense-in-depth + module separation |
| SECURITY-13 | §4.2 append-only via DB role + R-CONS-5 |
| SECURITY-15 | §1.4 fail-closed + §6.2 error hierarchy |

*No hay findings bloqueantes en este stage.*
