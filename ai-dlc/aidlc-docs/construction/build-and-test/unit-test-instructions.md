# Unit Test Instructions — Hermes MVP (Units 1+2+3)

> **Scope**: cómo correr unit tests + property-based tests (PBT) cuando el código sea generado.
> **Stack**: Vitest + Supertest + fast-check (heredado de Unit 1 TD-2..TD-5).
> **Coverage target**: 70% lines (Q4 NFR-R Unit 1 = B).

---

## 1. Test stack overview

| Tool | Versión target | Propósito |
|---|---|---|
| `vitest` | 1.x | Test runner principal (compatible Vite + ESM-friendly) |
| `@vitest/coverage-v8` | 1.x | Coverage report (V8-native, rápido) |
| `supertest` | 7.x | HTTP integration tests sobre Fastify app |
| `fast-check` | 3.x | Property-based testing (PBT extension activa en Inception) |
| `@faker-js/faker` (opcional) | 8.x | Generación de fixtures de test |
| `testcontainers` (integration only) | 10.x | Postgres/mailhog reales en CI Fase 2 |

---

## 2. Run commands

| Comando | Descripción |
|---|---|
| `npm test` | Todos los tests (unit + integration + PBT) |
| `npm run test:unit` | Solo `tests/unit/**` |
| `npm run test:integration` | Solo `tests/integration/**` (requiere docker compose up) |
| `npm run test:pbt` | Solo `tests/pbt/**` |
| `npm run test:coverage` | Coverage report en `coverage/` |
| `npm run test:watch` | Watch mode con re-run on change |
| `npm test -- <pattern>` | Filtrar por test name pattern |

---

## 3. Coverage targets (Q4 NFR-R U1 = B — 70% lines)

| Métrica | Target | Notas |
|---|---|---|
| Lines | ≥70% | enforced en CI (Fase 2); local advisory |
| Functions | ≥75% | derivado |
| Branches | ≥65% | derivado |
| Statements | ≥70% | igual que lines |

**Excluido del coverage**:
- `dist/` (compiled output)
- `migrations/` (SQL)
- `scripts/` (CLI utilities)
- `widget/` (cliente JS vanilla — frontend, separado del backend)
- `tests/` (los tests mismos)

Configuración en `vitest.config.ts`:
```ts
test: {
  coverage: {
    provider: 'v8',
    thresholds: { lines: 70, functions: 75, branches: 65, statements: 70 },
    exclude: ['dist/**', 'migrations/**', 'scripts/**', 'widget/**', 'tests/**', '**/*.d.ts']
  }
}
```

---

## 4. Test file organization (convención)

```
hermes/tests/
├── unit/                          # mocks de TODO externo (no DB, no SMTP)
│   ├── services/
│   │   ├── sentiment-scorer.test.ts        (U3)
│   │   ├── rollout-gate.test.ts            (U3)
│   │   ├── package-builder.test.ts         (U3)
│   │   ├── trigger-detector.test.ts        (U3)
│   │   ├── handoff.service.test.ts         (U3)
│   │   ├── alert-evaluator.test.ts         (U3)
│   │   ├── brand-config.service.test.ts    (U2)
│   │   ├── auth.service.test.ts            (U2)
│   │   ├── jwt.service.test.ts             (U2)
│   │   ├── conversation.service.test.ts    (U1)
│   │   ├── pipeline.test.ts                (U1)
│   │   └── ...
│   ├── lib/
│   │   ├── retry.test.ts
│   │   ├── circuit-breaker.test.ts
│   │   ├── ttl-cache.test.ts               (U3)
│   │   ├── pii-anonymizer.test.ts          (U1)
│   │   ├── hashing.test.ts                 (U1)
│   │   └── ...
│   ├── repositories/
│   │   └── (raras veces unit — mejor integration)
│   └── controllers/
│       └── (validation Zod schemas; raras)
│
├── pbt/                           # property-based tests con fast-check
│   ├── sentiment-scorer.pbt.test.ts        (U3 — Q5=A)
│   ├── rollout-gate.pbt.test.ts            (U3 — Q5=A)
│   ├── validate-package.pbt.test.ts        (U3 — Q5=A)
│   ├── retry.pbt.test.ts                   (U1)
│   ├── circuit-breaker.pbt.test.ts         (U1)
│   ├── pii-anonymizer.pbt.test.ts          (U1)
│   ├── hashing.pbt.test.ts                 (U1)
│   ├── brand-config-state-machine.pbt.test.ts (U2)
│   ├── jwt-roundtrip.pbt.test.ts           (U2)
│   └── bcrypt-roundtrip.pbt.test.ts        (U2)
│
└── integration/                   # ver integration-test-instructions.md
    └── ...
```

---

## 5. Mock strategy por external service

| External | Unit test strategy | Integration test strategy |
|---|---|---|
| **AWS Bedrock** | Mock `BedrockRuntimeClient.send` con respuestas pre-grabadas (fixtures en `tests/fixtures/bedrock/`) | Mock igualmente — no se llama real en CI |
| **SFCC API** | Mock undici `request` con fixtures (`tests/fixtures/sfcc/`) | Mock-server local opcional con `msw` |
| **SMTP (nodemailer)** | Mock `transporter.sendMail` retornando `{messageId: 'test-...'}` | **mailhog real** en docker-compose; verificar via mailhog API |
| **Slack webhook** | Mock `undici.request` retornando 200 OK | Mock — no se llama Slack real en CI |
| **Postgres** | Mock `pg.Pool` con `pg-mem` o stub | **Postgres real** en docker-compose; tear down between tests |
| **Filesystem (lexicon, prompts)** | Mock `readFileSync` con fixtures inline | Real reads del seed |

---

## 6. Tests específicos por Unit

### 6.1 Unit 1 — Core Agente
- `pipeline.test.ts` — 12 steps con happy path + cada step con error path
- `consent-gate.service.test.ts` — consent capture/check/decline
- `bedrock-client.test.ts` — invoke + retry + breaker behavior
- `sfcc-client.test.ts` — OAuth + 2 tool calls (`getOrderStatus`, `getStockAvailability`)
- `guardrails-input.test.ts` — denylist + length limits + injection patterns
- `guardrails-output.test.ts` — hallucination check + brand voice (placeholder MVP)
- `turn-log.repo.test.ts` — append-only enforcement
- PBT: `retry.pbt`, `circuit-breaker.pbt`, `pii-anonymizer.pbt`, `hashing.pbt`

### 6.2 Unit 2 — Knowledge & Brand Voice
- `auth.service.test.ts` — login happy + invalid_password + locked + expired
- `jwt.service.test.ts` — sign + verify + revoked + expired
- `brand-config.service.test.ts` — state transitions (draft→approved→active→archived) + activation atomicity TX
- `signoff.repo.test.ts` — append-only enforcement (INSERT only; UPDATE/DELETE fail)
- `permissions.middleware.test.ts` — JWT validation + brand scope check
- `diff.service.test.ts` — server-side diff render
- PBT: `bcrypt-roundtrip` (verify(hash(p))==p), `jwt-roundtrip`, `brand-config-state-machine`

### 6.3 Unit 3 — Handoff & Despliegue Gradual
- `sentiment-scorer.test.ts` — frases ES Col reales (queja, frustración, neutro)
- `rollout-gate.test.ts` — cache hit/miss + invalidación post-update
- `package-builder.test.ts` — happy + SFCC timeout (degraded_fields) + invalid package
- `trigger-detector.test.ts` — orden de evaluación 5 triggers + button bypass
- `handoff.service.test.ts` — orquestación end-to-end + idempotencia R-HO-7
- `delivery-adapter.test.ts` — SMTP retry exhausted + breaker open + happy
- `alert-evaluator.test.ts` — tick + throttling + Slack retry + critical bypasses cooldown
- `email-renderer.test.ts` — snapshot HTML/text/subject
- `ttl-cache.test.ts` — TTL expiration + invalidate
- `system-config.repo.test.ts` — get cache + update audit insert TX
- PBT: `sentiment-scorer.pbt`, `rollout-gate.pbt`, `validate-package.pbt`

---

## 7. Property-based test conventions (PBT extension)

PBT properties documentadas en cada NFR-D §6 / business-rules §8. Convenciones:

### 7.1 Estructura básica
```ts
import { test } from 'vitest';
import * as fc from 'fast-check';

test.prop([fc.string()])('SentimentScorer: range clampada [-1,1]', (text) => {
  const score = scorer.score(text);
  expect(score).toBeGreaterThanOrEqual(-1);
  expect(score).toBeLessThanOrEqual(1);
});
```

### 7.2 Numero de runs
- Default `fast-check`: 100 runs per property
- Override en tests lentos: `fc.assert(prop, { numRuns: 50 })`
- En CI con time budget tight: bajar a 50

### 7.3 Shrinking
fast-check automáticamente shrinkea contra-ejemplos. Cuando un test falla, output incluye el menor caso que rompe. Mostrar al user para debug rápido.

### 7.4 Arbitraries reusables (en `tests/pbt/arbitraries.ts`)
```ts
export const arbHandoffPackage = fc.record({
  trigger: fc.constantFrom('button_click','explicit_request','sentiment_negative','out_of_scope_intent','low_confidence'),
  mensaje_cliente: fc.string({ minLength: 1, maxLength: 2000 }),
  intencion_clasificada: fc.string(),
  intencion_confidence: fc.float({ min: 0, max: 1 }),
  sentimiento_score: fc.float({ min: -1, max: 1 }),
  // ...
});

export const arbValidUUID = fc.uuid();
```

---

## 8. Test data / fixtures

```
hermes/tests/fixtures/
├── bedrock/
│   ├── happy-classify-intent.json
│   ├── happy-generate-response.json
│   └── timeout-error.json
├── sfcc/
│   ├── get-order-status-happy.json
│   ├── get-stock-availability-happy.json
│   └── get-order-history-empty.json
├── handoff-packages/
│   ├── complete.json
│   ├── degraded-no-history.json
│   └── invalid-missing-trigger.json
└── conversations/
    ├── happy-state-pedido.json
    └── trigger-sentiment-negative.json
```

Fixtures versionadas en git; cargadas con `readFileSync('tests/fixtures/...', 'utf8')`.

---

## 9. CI considerations (MVP local-only)

**MVP**: tests corren localmente antes de commit (`npm test`). Sin CI pipeline en MVP per Q8 Inception (`OD-8 CI/CD pending Build and Test`).

**Decisión OD-8 (cerrar acá)**:
- **MVP**: tests local-only; PR review manual; sin GitHub Actions formal.
- **Fase 2 candidate**: GitHub Actions workflow ejecutando `npm test` + `npm run test:coverage` con threshold enforcement en PRs.

**Ejemplo workflow (Fase 2)**:
```yaml
# .github/workflows/test.yml (NO en scope MVP)
name: Test
on: [pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:pbt
      - run: npm run test:coverage
```

---

## 10. Unit test verification checklist

Antes de considerar "unit tests pasan":
- [ ] `npm run test:unit` exit code 0
- [ ] `npm run test:pbt` exit code 0 (incluye los 10 PBT files enumerados)
- [ ] `npm run test:coverage` reporta ≥70% lines
- [ ] Output incluye al menos 1 test verde por cada service/repo/lib enumerado en §6
- [ ] No hay `.only` o `.skip` accidentales (CI fallaría)
- [ ] Mocks de Bedrock y SFCC consistentes con fixtures

---

## 11. Out-of-scope MVP

- ❌ Contract tests (Pact / API contract) — Fase 2
- ❌ Snapshot testing exhaustivo (solo para email-renderer en U3)
- ❌ Visual regression testing (BM UI screenshots) — Fase 2 si web cambia frecuente
- ❌ Mutation testing (Stryker) — Fase 2
- ❌ CI pipeline GitHub Actions — Fase 2 (OD-8 cerrada como out-of-scope MVP)
- ❌ Coverage badges en README — Fase 2

---

## 12. Next steps

1. Cuando se ejecute Unit Code Generation: garantizar que cada plan incluye los tests enumerados en §6 (heredados de logical-components.md de cada unit).
2. Después de unit tests: integration tests → `integration-test-instructions.md`.
3. Performance soft validation → `performance-test-instructions.md`.
