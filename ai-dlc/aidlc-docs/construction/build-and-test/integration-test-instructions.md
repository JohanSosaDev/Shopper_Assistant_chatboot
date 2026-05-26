# Integration Test Instructions — Hermes MVP

> **Scope**: tests que verifican interacciones reales entre componentes (Postgres real, mailhog real, Fastify HTTP) usando docker-compose. Mocks limitados a externals que no se pueden controlar en CI (Bedrock, SFCC, Slack).
> **Stack**: Vitest + Supertest + docker-compose containers reales.

---

## 1. Filosofía

**Unit tests** mockean TODO externo → rápidos pero no detectan integration bugs.
**Integration tests** usan Postgres + mailhog reales (containerized) → más lentos pero validan:
- SQL migrations + queries reales
- TX atomicity (Postgres-level)
- SMTP delivery a mailhog real
- Pipeline `/chat` end-to-end con todos los plugins Fastify wireados

Cubrimos solo lo que vale la latencia: paths críticos del MVP.

---

## 2. Setup

### 2.1 Prerequisites
- Build local funcional (`npm run up` exitoso).
- `.env.test` con valores aislados (DB de test, mailhog reset entre runs).
- mailhog API endpoint disponible en `http://localhost:8025/api/v1`.

### 2.2 `vitest.integration.config.ts`
```ts
// Test runner config separado para no mezclar unit y integration
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,  // 30s — algunos tests esperan SMTP
    hookTimeout: 60_000,  // setup containers
    setupFiles: ['tests/integration/setup.ts'],
    pool: 'forks',  // aislar tests entre forks Node
    poolOptions: { forks: { singleFork: true } },  // secuencial — no parallelizar contra una misma DB
  },
});
```

### 2.3 `tests/integration/setup.ts`
```ts
// Lifecycle hooks: beforeAll start docker compose, afterAll teardown
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';

beforeAll(async () => {
  // Asume `npm run up` ya corrió. Si no:
  execSync('docker compose up -d postgres mailhog', { stdio: 'inherit' });
  await waitForHealthy('postgres', 60_000);
  await waitForHealthy('mailhog', 30_000);
  execSync('npm run migrate', { stdio: 'inherit' });
});

beforeEach(async () => {
  // Truncate tablas (no DROP — preserva migrations applied)
  await truncateAll();
  await reseedDefaults();   // brand_config Patprimo + system_config + alert_rules
  await clearMailhog();      // DELETE all messages via mailhog API
});

afterAll(async () => {
  // Opcional: dejar containers up para próximo run (más rápido)
  // execSync('docker compose down');
});
```

### 2.4 Mailhog helpers
```ts
// tests/integration/mailhog-helper.ts
export async function clearMailhog() {
  await undici.request('http://localhost:8025/api/v1/messages', { method: 'DELETE' });
}

export async function getMailhogMessages(): Promise<MailhogMessage[]> {
  const res = await undici.request('http://localhost:8025/api/v2/messages');
  const data = await res.body.json();
  return data.items;
}

export async function getLastEmailTo(toAddress: string): Promise<MailhogMessage | null> {
  const messages = await getMailhogMessages();
  return messages.find((m) => m.Content.Headers.To.includes(toAddress)) ?? null;
}
```

---

## 3. Run commands

```bash
# Asegurar containers up:
npm run up

# Correr integration tests:
npm run test:integration

# Filtrar por nombre:
npm run test:integration -- "handoff"

# Watch mode (re-run on change):
npm run test:integration -- --watch
```

Tiempo esperado: 60-120s para suite completa MVP.

---

## 4. Test scenarios por Unit

### 4.1 Unit 1 — Core Agente

| Test file | Scenario |
|---|---|
| `chat-happy-path.integration.test.ts` | POST /chat con consent → bot saluda → segundo turn con consulta de pedido → tool call SFCC mockeado → respuesta con orden status |
| `chat-consent-denied.integration.test.ts` | POST /chat → cliente dice "no autorizo" → bot responde con `consent_denied_text` y cierra |
| `chat-guardrail-block.integration.test.ts` | POST /chat con mensaje injection (prompt injection o SQL injection patterns) → guardrail bloquea → mensaje neutral |
| `turn-log-append-only.integration.test.ts` | Verificar via SQL que UPDATE/DELETE en `turn_log_audit` fallan por GRANTS |
| `circuit-breaker-bedrock.integration.test.ts` | Mock Bedrock 5xx 5 veces → breaker abre → 6to call retorna fast-fail sin invocar Bedrock |

### 4.2 Unit 2 — Knowledge & Brand Voice

| Test file | Scenario |
|---|---|
| `auth-login-flow.integration.test.ts` | POST /admin/auth/login happy + invalid_password (lockout después de 5 fails) + locked_until |
| `auth-jwt-revoke.integration.test.ts` | Login → logout → JWT revoked → siguiente request con ese token retorna 401 |
| `brand-config-crud.integration.test.ts` | Create draft → update → approve (sign-off) → activate → archive |
| `brand-config-activation-race.integration.test.ts` | 2 concurrent activate() de distintas versions → solo 1 wins (UNIQUE index parcial) |
| `bm-scope-enforcement.integration.test.ts` | BM user `patprimo` intenta acceder `/admin/brands/seven_seven/configs` → 403 |

### 4.3 Unit 3 — Handoff & Despliegue Gradual

| Test file | Scenario |
|---|---|
| `handoff-sentiment-trigger.integration.test.ts` | POST /chat con "esto es pesimo y horrible" → trigger sentiment_negative → ticket creado → email en mailhog |
| `handoff-explicit-button.integration.test.ts` | POST /chat con `{source: 'handoff_button'}` → trigger button_click → mismo flujo |
| `handoff-package-degraded.integration.test.ts` | Mock SFCC retorna timeout en `getOrderHistory` → ticket creado con `degraded_fields=['historico_pedidos']` |
| `handoff-idempotency.integration.test.ts` | 2 triggers en mismo conversation_id rápidos → solo 1 ticket creado (R-HO-7) |
| `rollout-gate-zero-percent.integration.test.ts` | `traffic_percentage=0` → todos los hits a `/widget/config` retornan offline message |
| `rollout-gate-50-percent.integration.test.ts` | 100 session IDs random → ~50 admitted, ~50 excluded (±5% tolerancia) |
| `rollout-gate-kill-switch.integration.test.ts` | `hermes_enabled=false` con `traffic_percentage=100` → todos excluded (override absoluto) |
| `rollout-cache-invalidation.integration.test.ts` | PATCH `/admin/rollout/traffic-percentage` → próxima request a `/widget/config` refleja el cambio en ≤1s (cache invalida) |
| `system-config-audit-insert.integration.test.ts` | UPDATE de `system_config` desde BM UI → INSERT en `system_config_audit` en mismo TX (verificar via SQL count antes/después) |
| `alert-evaluator-tick.integration.test.ts` | Seed `turn_log_audit` con latencias breach → trigger AlertEvaluator manualmente → verificar `alert_events` insertado + (si Slack mock configurado) webhook llamado |
| `alert-throttling.integration.test.ts` | Disparar misma regla 3 veces dentro del cooldown → solo 1 notification (notified=true), 2 con notified=false |
| `email-delivered-mailhog.integration.test.ts` | Trigger handoff → verificar email en mailhog via `getLastEmailTo('cx@patprimo.local')` con asunto correcto + multipart HTML+text |
| `email-delivery-failed.integration.test.ts` | Stop mailhog container → trigger handoff → retries fail → ticket en `delivery_failed*` → alerta builtin `email_delivery_failure_rate` dispara |
| `dashboard-kpis.integration.test.ts` | Seed `turn_log_audit` con N turns → GET `/admin/dashboard/kpis` → verificar 6 KPIs calculados correctamente |
| `escalations-drilldown.integration.test.ts` | Seed con 5 handoffs → GET `/admin/escalations?trigger=sentiment_negative` → 3 retornados (los del trigger especificado) |
| `conversation-detail.integration.test.ts` | GET `/admin/conversations/:id` retorna turns + handoff_ticket linked |

---

## 5. Test data utilities

### 5.1 Helpers seed-per-test
```ts
// tests/integration/seed.ts
export async function seedConversation(opts: { conversationId: string; turns: number; brand?: string }) {
  for (let i = 0; i < opts.turns; i++) {
    await pg.query(`INSERT INTO turn_log_audit (...) VALUES (...)`, [...]);
  }
}

export async function seedAlertRulesBuiltin() {
  // Inserta las 5 reglas builtin de migration 0010 si no existen
}

export async function seedBmUser(role: 'brand_manager' | 'operator' | 'admin', brand_scopes: string[] = ['patprimo']) {
  const hash = await bcrypt.hash('Testpass123!', 12);
  await pg.query(`INSERT INTO brand_manager_users (...) VALUES (...) RETURNING user_id`, [...]);
}
```

### 5.2 JWT helper para tests autenticados
```ts
export async function loginAs(role: 'admin' | 'operator'): Promise<string> {
  await seedBmUser(role);
  const res = await supertest(app.server).post('/admin/auth/login').send({
    email: `${role}@test.local`,
    password: 'Testpass123!',
  });
  return res.body.token;
}
```

---

## 6. Mock strategies (qué se mockea vs qué es real)

| Componente | Strategy en integration tests |
|---|---|
| **Postgres** | **REAL** (container) — esto es lo que valida integration |
| **mailhog SMTP + Web API** | **REAL** (container) — verifica email delivery real |
| **AWS Bedrock** | **MOCK** — `BedrockRuntimeClient.send` mockeada con fixtures; NO se llama Bedrock real en CI |
| **SFCC OCAPI/SCAPI** | **MOCK** — `undici.request` mock con fixtures; Fase 2 puede usar `msw` para mock server más realista |
| **Slack webhook** | **MOCK** — `undici.request` interceptada; verifica que se intentó POST con payload correcto |
| **Filesystem (sentiment lexicon)** | **REAL** — lee el JSON real de `prompts/sentiment_lexicon_es_co.json` |
| **node-cron** | **REAL** pero acelerado — para tests de AlertEvaluator, trigger `tick()` manualmente sin esperar 60s |

---

## 7. Anti-patterns a evitar

❌ **No usar tests integration para validar business logic puro** — eso es unit test. Integration valida wiring, TX, contratos.

❌ **No depender de orden entre integration tests** — cada test debe ser independiente (truncate + reseed en `beforeEach`).

❌ **No usar `setTimeout` para esperar mailhog** — usar polling con timeout corto o el webhook API de mailhog.

❌ **No correr integration tests en paralelo** — comparten DB y mailhog state.

❌ **No commitear con tests que requieren `sleep`** — flaky en CI; usar `vi.waitFor` con condition.

---

## 8. Integration test verification checklist

- [ ] `npm run test:integration` exit code 0 con docker compose up
- [ ] Suite total <2 minutos
- [ ] Cada test es independiente (passes en cualquier orden)
- [ ] mailhog API se llama para verify email delivery
- [ ] Postgres TX atomicity verificada en al menos 3 tests (rollout, sign-off, system_config_audit)
- [ ] Mocks de Bedrock y SFCC consistentes con unit tests (mismas fixtures)
- [ ] No `setTimeout(N)` hacks; usar `vi.waitFor` con condition

---

## 9. Out-of-scope MVP

- ❌ CI integration (run en GitHub Actions con services postgres + mailhog) — Fase 2 (OD-8 cerrada como Fase 2)
- ❌ Tests contra Bedrock real (cost + non-determinism)
- ❌ Tests contra SFCC sandbox real (acceso restringido)
- ❌ End-to-end con Playwright/Cypress sobre BM UI — Fase 2 si UI cambia frecuente
- ❌ Tests de performance dentro de integration suite — ver `performance-test-instructions.md`
- ❌ Chaos engineering (kill containers mid-test) — Fase 2

---

## 10. Troubleshooting

### 10.1 Test cuelga esperando mailhog
```bash
# Verificar mailhog está accesible:
curl http://localhost:8025/api/v2/messages
# Si retorna error → docker compose ps mailhog
```

### 10.2 Tests intermitentes (flaky) por TX timing
Usar `vi.waitFor` con condition explícita en lugar de timeout fijo:
```ts
await vi.waitFor(async () => {
  const tickets = await pg.query('SELECT COUNT(*) FROM handoff_ticket WHERE status=$1', ['delivered']);
  expect(tickets.rows[0].count).toBe('1');
}, { timeout: 5_000, interval: 100 });
```

### 10.3 Postgres connection pool exhausted entre tests
- Verificar que `app.close()` se llama en `afterAll`
- Reducir pool size en `.env.test`: `PG_POOL_MAX=5`

### 10.4 mailhog acumula emails entre tests
- Llamar `clearMailhog()` en `beforeEach`

### 10.5 Migration drift entre `npm run migrate` y test schema
- Truncate (no DROP); migrations ya están aplicadas
- Si schema diverge → docker compose down -v + up + migrate (fresh state)

---

## 11. Next steps

1. Después de integration tests verdes: performance soft validation → `performance-test-instructions.md`
2. Demo Day readiness: usar checklist de `build-and-test-summary.md`
