# Build and Test Summary — Hermes MVP

> **Stage**: Build and Test (último stage del CONSTRUCTION phase AI-DLC antes de OPERATIONS placeholder).
> **Status**: documentado completo. Implementación de tests pendiente — Code Generation U1/U2/U3 está diferido.
> **Demo Day**: 2026-06-09.

---

## 1. Documento map

Este stage produce 5 documentos en `aidlc-docs/construction/build-and-test/`:

| Documento | Cubre | Cuándo se usa |
|---|---|---|
| [build-instructions.md](./build-instructions.md) | Prerequisites, install, build, migrations, seed, verification | Una sola vez en cada laptop dev |
| [unit-test-instructions.md](./unit-test-instructions.md) | Vitest + fast-check, coverage 70%, mock strategies, tests enumerados por Unit | Cada commit, antes de PR review |
| [integration-test-instructions.md](./integration-test-instructions.md) | Vitest + Supertest + docker-compose real, end-to-end scenarios, mailhog real | Antes de merge a main, antes de Demo Day |
| [performance-test-instructions.md](./performance-test-instructions.md) | autocannon soft validation, SLO targets heredados, Vitest bench | Pre-Demo Day check; ad-hoc si algo se siente lento |
| [build-and-test-summary.md](./build-and-test-summary.md) | Este documento — overview + CI strategy + Demo Day readiness checklist | Onboarding del equipo + planning |

---

## 2. Test types matrix

| Tipo | Stack | Volumen esperado MVP | Localización | Velocidad |
|---|---|---|---|---|
| **Unit** | Vitest + mocks | ~80-100 tests | `tests/unit/**` | ~10-30s |
| **PBT** | Vitest + fast-check | ~10 tests con ~100 runs cada uno | `tests/pbt/**` | ~5-15s |
| **Integration** | Vitest + Supertest + Postgres + mailhog reales | ~20-30 tests | `tests/integration/**` | ~60-120s |
| **Performance (soft)** | autocannon + Vitest bench | 7 scenarios HTTP + 3 microbench | Ad-hoc CLI | ~5 min total |
| Contract | — | N/A MVP | — | N/A |
| Security pen-test | — | N/A MVP | — | N/A |
| E2E browser (Playwright) | — | N/A MVP | — | N/A |

**Coverage target**: 70% lines (Q4 NFR-R U1 = B). Aplica solo a unit + PBT; integration no cuenta para coverage por design.

---

## 3. CI/CD strategy (OD-8 cerrada acá)

### 3.1 Decisión MVP

**MVP**: tests local-only. Sin CI pipeline en GitHub Actions. Sin coverage gates automáticos. Cada dev corre `npm test` antes de commit.

**Justificación**:
- Equipo pequeño (1-3 devs MVP).
- Tiempo a Demo Day acotado (4 weeks total, ya en week 2-3).
- CI pipeline correcto + secrets manager + Bedrock test region + SFCC sandbox = >2 días setup.
- Riesgo de "test passes en CI pero falla local" es menor que el riesgo de "no llegamos a Demo Day".

### 3.2 Fase 2 candidate

Cuando se ejecute Code Generation o post-Demo Day:
```yaml
# .github/workflows/test.yml (NO en scope MVP)
name: Test
on: [pull_request, push]
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
        env:
          CI: true
      - uses: actions/upload-artifact@v4
        with: { name: coverage, path: coverage/ }

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: { POSTGRES_PASSWORD: testpass }
        ports: ['5432:5432']
        options: --health-cmd pg_isready
      mailhog:
        image: mailhog/mailhog:latest
        ports: ['1025:1025', '8025:8025']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run migrate
      - run: npm run test:integration
```

### 3.3 Gates (Fase 2)

| Gate | Threshold |
|---|---|
| Unit tests | Pass rate 100% (cero failures) |
| Coverage lines | ≥70% (block PR si baja) |
| Integration tests | Pass rate 100% |
| Build (`tsc`) | Cero errors |
| Lint | Cero errors |
| `npm audit` | Cero vulnerabilities `high`+ |

---

## 4. Demo Day readiness checklist (2026-06-09)

### 4.1 Build verification (≤1h antes)

- [ ] `npm run up` levanta 3 containers healthy
- [ ] 11 migraciones aplicadas sin error
- [ ] Seed Patprimo + alert_rules builtin presentes
- [ ] Al menos 1 admin user creado via `npm run create-bm`
- [ ] `GET /health/ready` retorna 200 ok

### 4.2 Unit + PBT tests

- [ ] `npm test` exit code 0
- [ ] `npm run test:coverage` reporta ≥70% lines
- [ ] No `.only`/`.skip` accidentales
- [ ] 10 PBT files corren con 100 runs cada uno sin counter-example

### 4.3 Integration tests

- [ ] `npm run test:integration` exit code 0 con docker compose up
- [ ] Suite total <2 min
- [ ] mailhog recibe emails de handoff durante tests
- [ ] Postgres TX atomicity verificada (rollout audit, sign-off, system_config_audit)

### 4.4 Performance soft validation

- [ ] `/widget/config` p95 <50ms con 50 conn concurrentes
- [ ] `/chat` happy path p95 <8s
- [ ] `/chat` con handoff trigger p95 <1s
- [ ] `/admin/dashboard/kpis` p95 <3s con seed
- [ ] Login p50 250-400ms (no <100ms — indica bcrypt mal config)

### 4.5 Backup + runbook

- [ ] `npm run backup -- pre-demo-day-2026-06-09` produce archivo en `backups/`
- [ ] `aidlc-docs/construction/unit3-handoff-convivencia/infrastructure-design/deployment-architecture.md` §6 (Demo Day runbook) revisado por equipo
- [ ] Comandos curl para PATCH rollout copiados a notas operativas
- [ ] Plan B documentado (kill switch si demo falla)

### 4.6 Pre-demo (5 min antes)

- [ ] Smoke `autocannon -d 10 -c 5 http://localhost:3000/health/ready` OK
- [ ] mailhog Web UI accesible en `localhost:8025` (compartir pantalla preparada)
- [ ] BM UI accesible en `localhost:3000/admin/dashboard` con admin login working
- [ ] `traffic_percentage=5` aplicado el día anterior (canary)

### 4.7 Durante demo

- [ ] Subir `traffic_percentage` a 25 al inicio del demo
- [ ] Si todo limpia: subir a 100 al final
- [ ] Si incident: kill switch off + mostrar plan B

### 4.8 Post-demo

- [ ] `npm run backup -- post-demo-day-2026-06-09`
- [ ] Revisar `system_config_audit` para auditar todos los cambios del runbook
- [ ] Compartir export de KPIs con stakeholders (CTO + Sponsor)

---

## 5. What's covered by tests vs what's NOT

### 5.1 Cubierto por tests automatizados

✅ Funcionalidad core `/chat` (pipeline 14 steps con U3 extensión)
✅ Auth flow (login + lockout + JWT lifecycle)
✅ Brand config workflow (draft → approved → active → archived)
✅ Handoff triggers (5 tipos + button bypass)
✅ Handoff package construction (degraded fields fallback)
✅ Handoff delivery (mailhog real en integration)
✅ Rollout gate (kill switch + hash determinístico + cache invalidation)
✅ AlertEvaluator (tick + throttling + Slack retry)
✅ Dashboard queries (6 KPIs + drill-down)
✅ TX atomicity (Postgres-level)
✅ PBT en funciones puras críticas (sentiment, rollout, validate package)
✅ Resilience patterns (retry + circuit breaker)

### 5.2 NO cubierto por tests automatizados — validación manual MVP

❌ UI usability del widget cliente (`widget/index.js`) — validar manualmente con `/chat` HTML page
❌ UI usability del BM UI (EJS templates) — validar manualmente click-through
❌ Calidad del LLM response (Bedrock Haiku 4.5 outputs) — eval offline manual per PRD §13
❌ Brand voice consistency (Patprimo "Sofía") — sign-off del Brand Manager per E4-S1
❌ Real Bedrock latency en `sa-east-1` — medir en pre-Demo Day con cuentas reales
❌ Real SFCC latency vs MOC — coordinar con equipo SFCC PASH
❌ Calidad del email a CX — review manual con equipo CX
❌ Security pen-testing — Fase 2

---

## 6. Tests gap analysis (MVP vs Fase 2)

| Capability | MVP coverage | Fase 2 needed |
|---|---|---|
| Functional correctness | Alto (unit + integration) | — |
| Performance bajo MVP load | Medio (soft autocannon) | Formal K6/Gatling |
| Resilience | Alto (retry/breaker tested) | Chaos engineering (kill containers) |
| Security | Medio (Zod input validation, JWT, RBAC tested) | Pen-test profesional |
| Compliance | Bajo (consent + PII handling tested unit) | Audit completo Ley 1581 |
| UX / Accessibility | Bajo (a11y manual + WCAG AA en widget) | Automated axe-core scans |
| LLM output quality | Bajo (sin eval automatizada) | Eval offline + red team formal (PRD §13) |
| Brand voice | Bajo (sign-off manual) | Sample weekly automated |

---

## 7. Out-of-scope explicit del Build and Test stage MVP

- ❌ Contract tests (Pact / consumer-driven)
- ❌ Mutation testing (Stryker)
- ❌ Visual regression testing
- ❌ Cross-browser E2E (solo desktop modern per Q4 NFR-R U2)
- ❌ Mobile E2E
- ❌ Penetration testing
- ❌ Compliance audit formal
- ❌ Disaster recovery tests
- ❌ CI/CD pipeline GitHub Actions (OD-8 cerrada como Fase 2)
- ❌ Multi-region testing
- ❌ Real Bedrock cost-validation runs
- ❌ SLO regression gates en CI

Todos pasan a Fase 2 post-Demo Day si el piloto entrega resultados que justifiquen la inversión.

---

## 8. Estado final del stage Build and Test

✅ **5 instruction docs generadas en `aidlc-docs/construction/build-and-test/`**.
⏸️ **Implementación de tests pendiente** — depende de Code Generation U1/U2/U3 que está diferido.
🎯 **Cuando se ejecute Code Generation** de cada Unit, los planes deberán incluir creación de los test files enumerados en cada `nfr-design/logical-components.md`.

---

## 9. Next stage

Una vez aprobado este stage, el workflow AI-DLC entra a **🟡 OPERATIONS PHASE** (placeholder en MVP per CLAUDE.md). En la práctica:

- Sin actividades operations en MVP scope.
- Run book Demo Day ya documentado en `aidlc-docs/construction/unit3-handoff-convivencia/infrastructure-design/deployment-architecture.md` §6.

---

## 10. Security Compliance Summary (stage = Build and Test)

| Rule | Cobertura |
|---|---|
| SECURITY-05 (input validation) | Unit + integration tests Zod schemas verifican rechazos |
| SECURITY-08 (access control) | Integration tests verifican 401/403 en `/admin/*` sin/con JWT inválido |
| SECURITY-11 (secure design) | Integration tests verifican fail-closed en RolloutGate (kill switch override) y HandoffService (package inválido) |
| SECURITY-12 (auth credentials) | Integration tests cubren brute-force lockout + JWT revocation |
| SECURITY-13 (data integrity) | Integration tests verifican append-only en `handoff_ticket`, `system_config_audit`, `sign_offs` |
| SECURITY-14 (alerting + monitoring) | Integration tests `alert-evaluator-tick` y `alert-throttling` verifican system de alertas |
| Otros | Cubiertos en stages anteriores (NFR-R, NFR-D, ID de cada Unit) |

*No hay findings bloqueantes en este stage.*
