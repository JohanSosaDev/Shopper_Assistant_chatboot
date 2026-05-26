# Performance Test Instructions — Hermes MVP

> **Scope**: validación soft de performance ANTES de Demo Day. Sin formal load testing en MVP per Q1 NFR-R Unit 1 (best-effort para todos los endpoints excepto `/chat`).
> **Filosofía MVP**: confirmar que los SLOs documentados se cumplen en condiciones realistas a MVP volume; no estresar el sistema más allá de lo razonable.

---

## 1. Targets a verificar (heredados de NFR-R Units 1+2+3)

| Endpoint / componente | Target SLO | Origen |
|---|---|---|
| `POST /chat` (sin handoff) | <8s p95 end-to-end | U1 NFR-R |
| `POST /chat` (con handoff trigger) | <1s p95 (sin generate_response) | U3 NFR-R §1.1 |
| `GET /widget/config` (hot path) | **<50ms p95** | U3 NFR-R §1.1 |
| `GET /admin/dashboard/kpis` | <3s page load p95 | U3 NFR-R §1.1 (heredado de FD R-DASH-3) |
| Queries individuales dashboard | <500ms p95 | U3 NFR-R §1.1 (heredado de FD R-DASH-3) |
| `POST /admin/auth/login` | ~250-400ms (dominado por bcrypt 12 rounds) | U2 NFR-R |
| `SentimentScorer.score()` | <5ms p95 | U3 NFR-R §1.1 |
| `RolloutGate.shouldServeHermes()` | <10ms p95 (con cache hit) | U3 NFR-R §1.1 |
| `AlertEvaluator.tick()` total | <30s (cabe en cron 60s) | U3 NFR-R §1.1 |

---

## 2. Tool & approach

**MVP**: `autocannon` (npm devDependency) para HTTP load testing. **Sin K6/Gatling/JMeter en MVP** — overkill para un soft validation.

**Para componentes internos** (SentimentScorer, RolloutGate): microbench via Vitest `bench`:
```ts
import { bench } from 'vitest';
bench('SentimentScorer.score', () => {
  scorer.score('esto es horrible y pesimo');
});
```

---

## 3. Run commands

### 3.1 autocannon scenarios

```bash
# Smoke: /health/ready durante 30s, 10 conn concurrentes
npx autocannon -d 30 -c 10 http://localhost:3000/health/ready

# /widget/config (hot path; target <50ms p95)
npx autocannon -d 30 -c 50 \
  -H 'Cookie: hermes_session=test-session-uuid' \
  http://localhost:3000/widget/config

# /chat happy path (target <8s p95)
npx autocannon -d 60 -c 5 \
  -m POST \
  -H 'Content-Type: application/json' \
  -b '{"conversationId":"perf-1","brand":"patprimo","message":"hola"}' \
  http://localhost:3000/chat
```

### 3.2 Vitest bench

```bash
# Microbenchmarks de funciones puras
npm run bench   # = vitest bench tests/bench
```

Targets:
- `SentimentScorer.score` bench → <5ms median
- `RolloutGate.shouldServeHermes` (con cache) → <1ms median
- `validatePackage` → <1ms median

---

## 4. Test scenarios

### 4.1 Smoke (sanity check 5 min antes de Demo Day)
```bash
npx autocannon -d 10 -c 5 http://localhost:3000/health/ready
```
Esperado: 0 errors, p95 <100ms.

### 4.2 Widget hot path
```bash
npx autocannon -d 30 -c 50 http://localhost:3000/widget/config
```
Esperado: p95 <50ms (cache hits dominantes).

### 4.3 /chat con consent (cold start)
Primera ejecución incluye Bedrock cold path:
```bash
npx autocannon -d 60 -c 5 -m POST \
  -H 'Content-Type: application/json' \
  -b '{"conversationId":"perf-cold","brand":"patprimo","message":"hola"}' \
  http://localhost:3000/chat
```
Esperado: p95 <8s; p99 puede estirar a 12-15s en cold start.

### 4.4 /chat con consulta de pedido (tool call SFCC)
```bash
npx autocannon -d 60 -c 5 -m POST \
  -H 'Content-Type: application/json' \
  -b '{"conversationId":"perf-pedido","brand":"patprimo","message":"cuál es el estado de mi pedido #12345"}' \
  http://localhost:3000/chat
```
Esperado: p95 <8s incluyendo SFCC roundtrip (mock o real).

### 4.5 /chat con handoff trigger (skip generate_response)
```bash
npx autocannon -d 60 -c 5 -m POST \
  -H 'Content-Type: application/json' \
  -b '{"conversationId":"perf-handoff","brand":"patprimo","message":"esto es horrible PESIMO quiero hablar con humano"}' \
  http://localhost:3000/chat
```
Esperado: p95 <1s (sin Bedrock call de generate_response; solo classify + sentiment + trigger + package + INSERT).

### 4.6 Dashboard
```bash
TOKEN=$(curl -sX POST http://localhost:3000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.local","password":"Testpass123!"}' | jq -r .token)

npx autocannon -d 30 -c 3 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/dashboard/kpis
```
Esperado: p95 <3s con MVP volume (<1000 turns en `turn_log_audit`).

### 4.7 Login (bcrypt-bound)
```bash
npx autocannon -d 30 -c 3 -m POST \
  -H 'Content-Type: application/json' \
  -b '{"email":"admin@test.local","password":"Testpass123!"}' \
  http://localhost:3000/admin/auth/login
```
Esperado: p50 ~250-400ms (bcrypt 12 rounds); throughput limitado por CPU.

---

## 5. Seed de data para perf realista

Antes de correr perf en dashboards, sembrar volumen MVP-realista:

```bash
# Seed ~1000 turns en turn_log_audit
npm run seed:perf
# Internamente: INSERT INTO turn_log_audit SELECT ... FROM generate_series(1, 1000)
```

Script `seed:perf` queda en `scripts/seed-perf.ts`; cubre conversaciones random con distribución 70% happy / 20% guardrail / 10% handoff.

---

## 6. Interpretación de resultados

### 6.1 Por qué importa cada SLO

| SLO | Por qué importa |
|---|---|
| `/widget/config` <50ms | Hot path — cada cliente que abre la página llama esto; impacta TTFB del widget |
| `/chat` <8s | UX cliente final; LLM dominante; si supera 8s, considerar streaming en Fase 2 |
| Dashboard <3s | UX operador; Demo Day el CTO ve esto |
| Login <400ms | bcrypt 12 rounds es ceiling razonable; balance security vs UX |

### 6.2 Qué hacer si un SLO no se cumple

| SLO no cumple | Investigar | Mitigation |
|---|---|---|
| `/widget/config` >50ms | Cache hit ratio bajo; queries DB excesivas | Verificar `TtlCache` está cacheando; profile con `clinic.js` |
| `/chat` >8s | Bedrock latency; SFCC roundtrip; tool calls excesivos | Region Bedrock; SFCC timeout; reducir context size del prompt |
| Dashboard >3s | Queries sin índice; volumen mayor del esperado | Verificar `EXPLAIN ANALYZE`; agregar índices delta |
| Login >500ms | bcrypt rounds altos para hardware | Bajar a 10 rounds (acceptable per OWASP) o agregar caching de session post-login |

### 6.3 Outputs autocannon a copiar al report

```
┌─────────┬────────┬────────┬────────┬─────────┬──────────┐
│ Stat    │ 2.5%   │ 50%    │ 97.5%  │ 99%     │ Avg      │
├─────────┼────────┼────────┼────────┼─────────┼──────────┤
│ Latency │ 5 ms   │ 18 ms  │ 45 ms  │ 78 ms   │ 22 ms    │
└─────────┴────────┴────────┴────────┴─────────┴──────────┘
```

Reportar: avg latency + p50 + p95 + p99 + throughput (req/s) + error rate.

---

## 7. Performance test verification checklist

Antes de Demo Day:
- [ ] `/widget/config` p95 <50ms con 50 conn concurrentes
- [ ] `/chat` happy path p95 <8s con 5 conn concurrentes
- [ ] `/chat` handoff trigger p95 <1s
- [ ] `/admin/dashboard/kpis` p95 <3s con seed ~1000 turns
- [ ] `/admin/auth/login` p50 250-400ms (no debe ser <100ms — eso indicaría bcrypt mal configurado)
- [ ] `npm run bench` confirma `SentimentScorer.score` <5ms median
- [ ] Cero 5xx errors en runs de 60s
- [ ] Cero memory leaks visibles (`docker stats hermes` constante durante run)

---

## 8. Out-of-scope MVP

- ❌ Formal load testing tools (K6, Gatling, JMeter)
- ❌ Sustained load testing (>1h)
- ❌ Geographic latency testing (multi-region)
- ❌ Stress testing hasta rotura
- ❌ Performance regression CI gates — Fase 2
- ❌ Profiling con clinic.js / 0x (puede correrse ad-hoc si SLO no cumple)
- ❌ Tests con Bedrock real (cost prohibitivo)
- ❌ Tests con SFCC sandbox real

---

## 9. Out-of-scope per NFR-R explicit decisions

Heredados de NFR-R U1/U2/U3 §9:
- ❌ Load testing para admin endpoints (3-5 users)
- ❌ Multi-region failover
- ❌ Concurrency >50 simultaneous /chat (Q3 Inception = `~50 conv concurrent` ya validado por design U1)

---

## 10. Troubleshooting

### 10.1 autocannon retorna conexiones rechazadas
```bash
# Verificar Hermes está arriba:
docker compose ps hermes
# Verificar listener:
docker compose exec hermes netstat -tnlp | grep 3000
```

### 10.2 Latencias muy altas (cold start vs warm)
- Primer minuto incluye cold start (JIT, connection pool warm-up). Descartar primeros 10s del run.
- `autocannon -d 60` para tener 50s warm.

### 10.3 Rate limit hit durante perf test
- Aumentar rate limit en `.env.test`: `RATE_LIMIT_MAX=10000` para perf runs.
- O usar IPs diferentes via `--connections-rate`.

### 10.4 Memory growth
```bash
docker stats hermes --no-stream
# Si RSS crece monotonamente durante run → posible leak; profile con --inspect
```

---

## 11. Next steps

1. Después de verificar perf en checklist §7: aprobar Build and Test stage completo.
2. Demo Day: ejecutar smoke (§4.1) 5 min antes del demo como sanity check.
3. Si algún SLO no cumple → investigar (§6.2) antes de Demo Day, no durante.
