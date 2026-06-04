# VALIDATION.md — Hermes

Catálogo único de cómo verificar que algo funciona. Esta es la chuleta ejecutable. El manual completo está en `ai-dlc/aidlc-docs/construction/build-and-test/` (5 documentos detallados).

Lee esto si: acabas de generar código y necesitas validarlo, vas a hacer review de un PR, vas a correr el pre-Demo Day checklist, o eres un agente que necesita saber qué comando correr cuándo.

## Pre-flight

Antes de validar cualquier cosa, asegurar:

- [ ] `npm ci` corrido (lock file aplicado).
- [ ] `.env` poblado con `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SFCC_BASE_URL`, `SFCC_CLIENT_ID`, `SFCC_CLIENT_SECRET`, `PII_SALT`, `ALLOWED_ORIGINS`, `BEDROCK_REGION=sa-east-1`.
- [ ] `docker compose up -d postgres mailhog` corriendo.
- [ ] `npm run migrate` aplicó las 11 migraciones (0001..0010) sin error.
- [ ] `npm run seed` insertó Patprimo BrandConfig + 5 alert rules builtin.

Sin esto, casi todo el resto va a fallar.

## Validaciones automáticas

### Sintaxis y tipos

| Validación | Comando | Espera | Cuándo correr |
|---|---|---|---|
| Lint | `npm run lint` | 0 errores ESLint, 0 warnings Prettier | Pre-commit (hook), antes de PR |
| Type check | `npm run typecheck` | 0 errores TS strict | Pre-commit, antes de PR |
| Format | `npm run format` | Sin diff tras correr | Auto vía PostToolUse hook |

### Tests

| Validación | Comando | Stack | Volumen MVP | Velocidad | Cuándo |
|---|---|---|---|---|---|
| Unit tests | `npm test` | Vitest + mocks | ~80-100 tests | 10-30s | Tras cada cambio de código |
| Property-based tests | `npm run test:pbt` | Vitest + fast-check | ~10 propiedades × 100 runs | 5-15s | Cuando se toca `lib/`, `RolloutGate`, `SentimentScorer`, `validatePackage` |
| Coverage | `npm run test:coverage` | Vitest coverage | Target ≥70% lines en `services/` | 30-60s | Antes de PR |
| Integration | `npm run test:integration` | Vitest + Supertest + docker-compose | ~20-30 tests | 60-120s | Antes de merge a main, antes de Demo Day |
| Build | `npm run build` | tsc + esbuild | — | 10-20s | Antes de deploy |

**Coverage target**: 70% líneas en `services/` (Q4 NFR-R Unit 1). Aplica solo a unit + PBT. Integration no cuenta para coverage por design.

**Counter-examples PBT**: si fast-check encuentra contra-ejemplo, el agente debe **detener** la generación y reportar al humano. No silenciar con `.skip`.

### Bundle widget

| Validación | Comando | Espera |
|---|---|---|
| Bundle size widget JS | `npm run build && ls -la hermes/widget/public/widget.js` | ≤30kb gzipped |
| Bundle size widget CSS | `npm run build && ls -la hermes/widget/public/widget.css` | ≤5kb gzipped |
| TTI mobile 4G | medida manual en DevTools throttling | <500ms |

Si bundle excede el target, ver qué dependencia se coló. El widget no debe usar Chart.js, D3, ninguna lib >5kb.

### Migrations

| Validación | Comando | Espera |
|---|---|---|
| Apply migrations | `npm run migrate` | Aplicación limpia sin error |
| Rollback test | `npm run migrate:down && npm run migrate` | Round-trip exitoso (Fase 2 si decidimos forward-only no es suficiente) |
| Seed | `npm run seed` | Patprimo brand_config_versions con `status='active'` + 5 `alert_rules` con `is_builtin=true` |

## Validaciones manuales

### Smoke tests pre-Demo Day

Curl desde otra terminal con `npm run up` corriendo:

```bash
# Readiness
curl http://localhost:3000/health/ready
# espera: 200 { status: "ready" }

# Widget config (lo que el widget consume al cargar)
curl http://localhost:3000/widget/config?brand=patprimo
# espera: 200 con consentRequestText, customerFacingName, etc.

# Chat happy path (Caso 1)
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test-001","brand":"patprimo","message":"sí, acepto"}'
# espera: 200 con respuesta del bot acknowledgement
```

Scripts agrupados:

| Script | Qué valida |
|---|---|
| `npm run smoke:caso1` | Turn end-to-end: consent → identificación → tool call SFCC → respuesta + ETA |
| `npm run smoke:handoff` | Trigger sentiment_negative → ticket creado → email en mailhog |
| `npm run smoke:brand-flow` | CRUD versionado Brand Manager: submit → approve → activate → rollback |
| `npm run smoke:rollout` | Kill switch off → widget retorna mensaje offline; toggle traffic % refleja en ≤60s |

### Mailhog (handoff emails)

- Web UI: `http://localhost:8025` (compartir pantalla durante demo).
- Verificar emails recibidos durante smoke handoff.
- Subject debería tener tag `[ALTA]` o `[NORMAL]` según trigger (R-HOD-5).

### Brand Manager UI

- Login: `http://localhost:3000/admin/login` con admin creado vía `npm run create-bm`.
- Dashboard versiones Patprimo: `http://localhost:3000/admin/brands/patprimo/configs`.
- Crear draft → approve → activate workflow completo manualmente.
- Verificar diff visual y modals de confirmación 2-step.

### Dashboard operador

- Login con user role `operator` o `admin`.
- `http://localhost:3000/admin/dashboard` debe renderizar 6 KPIs + lista de escalations.
- Drill-down a conversación individual debe mostrar `turn_log_audit` + `handoff_ticket` si aplica.
- Endpoint p95 <3s con seed data.

### Auditoría visual

Después de generar componentes UI, correr en orden:

```
/web-design-guidelines              # 100+ reglas UI compliance
/accessibility                       # WCAG 2.2 audit
/make-interfaces-feel-better         # detalles de polish
/impeccable audit                    # audit técnico 5 dimensiones
/userinterface-wiki                  # 152 reglas UI/UX
```

Resolver findings P0 y P1 antes de declarar componente completo.

### Code review pre-merge

```
/code-review                         # bugs + simplificaciones
/security-review                     # security review pending changes
/best-practices                      # security + compatibility + quality
```

Resolver findings críticos. Documentar findings P3 como follow-up.

## Validaciones por unidad

### Unit 1 — Core Agente

Tests específicos (per build-and-test):

```bash
# Unit
npm test -- tests/unit/conversation
npm test -- tests/unit/sfcc
npm test -- tests/unit/identity
npm test -- tests/unit/compliance

# PBT
npm run test:pbt -- tests/pbt/pii-anonymizer
npm run test:pbt -- tests/pbt/retry-circuit-breaker

# Integration
npm run test:integration -- tests/integration/chat-happy-path
npm run test:integration -- tests/integration/chat-consent-denied
npm run test:integration -- tests/integration/chat-guardrail-block

# Smoke
npm run smoke:caso1
```

**Definition of Done** Unit 1:
- [ ] Demo Caso 1 happy path responde con orden + ETA usando datos reales o mock.
- [ ] Latencia p50 `/chat` <30s en local.
- [ ] Las 7 stories de Unit 1 tienen tests pasando.
- [ ] SECURITY-01, 03, 05, 08, 11, 15 compliant.

### Unit 2 — Knowledge & Brand Voice

```bash
# Unit
npm test -- tests/unit/brand-config
npm test -- tests/unit/sign-off
npm test -- tests/unit/auth

# Integration
npm run test:integration -- tests/integration/brand-flow
npm run test:integration -- tests/integration/auth-lockout

# Smoke
npm run smoke:brand-flow
```

**Definition of Done** Unit 2:
- [ ] Patprimo v1 con sign-off persistido en `sign_offs`.
- [ ] Activate replaces seed sin re-deploy de Hermes.
- [ ] Rollback v1 → v2 → v1 verificado en <1h.

### Unit 3 — Handoff & Despliegue Gradual

```bash
# Unit
npm test -- tests/unit/sentiment-scorer
npm test -- tests/unit/trigger-detector
npm test -- tests/unit/package-builder
npm test -- tests/unit/rollout-gate

# PBT
npm run test:pbt -- tests/pbt/sentiment-scorer
npm run test:pbt -- tests/pbt/rollout-gate
npm run test:pbt -- tests/pbt/validate-package

# Integration
npm run test:integration -- tests/integration/handoff-sentiment-trigger
npm run test:integration -- tests/integration/handoff-explicit-button
npm run test:integration -- tests/integration/rollout-gate-zero-percent
npm run test:integration -- tests/integration/alert-evaluator-tick

# Smoke
npm run smoke:handoff
npm run smoke:rollout
```

**Definition of Done** Unit 3:
- [ ] Handoff completo: trigger → package → email en mailhog <60s.
- [ ] RolloutGate determinístico por `sessionId` (PBT verifica monotonía + kill switch absoluto).
- [ ] Kill switch operable en <1 min vía `PATCH /admin/rollout/kill-switch`.
- [ ] Dashboard 6 KPIs renderiza con p95 <3s.

## Performance soft validation (pre-Demo Day)

```bash
# Throughput readiness
autocannon -d 10 -c 5 http://localhost:3000/health/ready
# espera: 0 errors, latency p95 <50ms

# Widget config bajo carga
autocannon -d 30 -c 50 'http://localhost:3000/widget/config?brand=patprimo'
# espera: p95 <50ms

# Chat happy path (lo más caro)
# scripts/perf-chat.js con autocannon programático
# espera: p95 <8s con Bedrock real
```

Targets pre-Demo Day:

| Endpoint | p95 target | Razón |
|---|---|---|
| `/health/ready` | <50ms | Docker healthcheck |
| `/widget/config` | <50ms | Cargado en cada page load del storefront |
| `/chat` happy path | <8s | NFR Unit 1 |
| `/chat` con handoff | <1s | NFR Unit 3 (no espera Bedrock completo) |
| `/admin/dashboard/kpis` | <3s | NFR Unit 3 R-DASH-3 |
| Login BM | 250-400ms p50 | bcrypt rounds 12; menos = config mal |

## Demo Day readiness checklist (2026-06-09)

### Día -1 (preparación)

- [ ] `npm run rebuild && npm run up` — build fresh, 3 containers healthy.
- [ ] `npm run migrate && npm run seed` — DB con sample data.
- [ ] `npm run create-bm -- --email demo@pash.com.co` — admin user listo.
- [ ] Verificar Bedrock: `aws bedrock list-foundation-models --region sa-east-1` responde OK.
- [ ] Verificar SFCC sandbox: `curl https://<sandbox>.demandware.net/health` o equivalente OAuth.
- [ ] Cloudflare Tunnel arriba: `cloudflared tunnel --url http://localhost:3000` → URL anotada.
- [ ] System Preference `hermesApiBaseUrl` en Business Manager seteada con URL del tunnel.
- [ ] Cartridge `int_hermes` activo en cartridge path de la sandbox.
- [ ] Grabar video del happy path con `SFCC_MODE=mock` como Plan C.
- [ ] `npm run backup -- pre-demo-day-2026-06-09` produce snapshot SQL.

### Día 0 — 1 hora antes

- [ ] `npm run up` → 3 containers healthy.
- [ ] Smoke `npm run smoke:caso1` exit code 0.
- [ ] `curl /health/ready` → 200.
- [ ] BM UI accesible en `localhost:3000/admin/dashboard`.
- [ ] mailhog UI accesible en `localhost:8025` (compartir pantalla preparada).
- [ ] `traffic_percentage=5` aplicado el día anterior (canary).
- [ ] Cloudflare Tunnel URL respondiendo desde browser.
- [ ] Storefront sandbox SFCC carga widget visible.

### Día 0 — durante el demo

- [ ] Subir `traffic_percentage` a 25 al inicio del demo.
- [ ] Si todo limpia: subir a 100 al final.
- [ ] Si incident: kill switch off + activar Plan B (`SFCC_MODE=mock`).
- [ ] Si todo falla: proyectar video pre-grabado (Plan C).

### Día 0 — post-demo

- [ ] `npm run backup -- post-demo-day-2026-06-09`.
- [ ] Revisar `system_config_audit` (auditar todos los cambios del runbook).
- [ ] Compartir export de KPIs con stakeholders (CTO + Sponsor).

## Gates de promoción

| De | A | Gate |
|---|---|---|
| Stage NFR-R aprobado | Stage NFR-D | Approval explícita del humano |
| Stage NFR-D aprobado | Stage Infrastructure Design | Approval explícita |
| Stage ID aprobado | Code Generation | Approval explícita + revisión de tech-stack-decisions |
| Code Generation completo Unit N | Code Generation Unit N+1 | Unit N: lint + typecheck + unit + integration + Definition of Done ✓ |
| Code Generation Unit 3 completo | Build and Test stage | Las 3 unidades con DoD ✓ |
| Build and Test stage | Operations placeholder | Suite completa pasa + Demo Day readiness ✓ |
| Operations placeholder | Demo Day | Día -1 checklist completo + backups generados |

## Lo que NO se valida (out-of-scope MVP)

| Capability | Status MVP | Fase 2 |
|---|---|---|
| Contract tests (Pact) | ❌ | Posible |
| Mutation testing (Stryker) | ❌ | Posible |
| Visual regression | ❌ | Posible |
| Cross-browser E2E Playwright | ❌ | Posible |
| Mobile E2E | ❌ | Posible |
| Penetration testing | ❌ | Recomendado |
| Compliance audit Ley 1581 formal | ❌ | Recomendado |
| Disaster recovery tests | ❌ | Cuando AWS-hosted |
| CI/CD pipeline GitHub Actions | ❌ (OD-8) | Sí |
| SLO regression gates en CI | ❌ | Sí |
| LLM eval automatizada | ❌ (manual sign-off) | Sí (red team formal per PRD §13) |
| Brand voice consistency automated | ❌ (sample manual semanal) | Sí (sample automated per Unit 2 out-of-scope) |

## Fuentes de contexto

- `ai-dlc/aidlc-docs/construction/build-and-test/build-and-test-summary.md` — overview detallado + CI strategy Fase 2.
- `ai-dlc/aidlc-docs/construction/build-and-test/build-instructions.md` — prerequisites + install + migrations.
- `ai-dlc/aidlc-docs/construction/build-and-test/unit-test-instructions.md` — Vitest + fast-check enumerated tests.
- `ai-dlc/aidlc-docs/construction/build-and-test/integration-test-instructions.md` — Supertest + docker-compose scenarios.
- `ai-dlc/aidlc-docs/construction/build-and-test/performance-test-instructions.md` — autocannon soft validation.
- `ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/infrastructure-design/deployment-architecture.md` §6 — Demo Day runbook detallado.
- [STACK.md](STACK.md) — stack tecnológico de referencia.
- [AGENTS.md](AGENTS.md) — convenciones del repo y permisos.
- Memoria: [Plan B Demo Day](memory/project_demo_day_plan_b.md).
