# Validations — Hermes

> **Propósito:** Inventario de mecanismos de validación disponibles para Hermes — qué se puede correr **hoy**, qué espera Code Generation, y qué requiere intervención humana obligatoria. Entregable de **Estación 6 (Implementando)**.
>
> **Por qué importa:** define qué "bloquea entrega" en cada estado del proyecto. Hoy la única validación operativa es **revisión humana + audit log AI-DLC**; los tests Vitest/autocannon están **documentados pero no ejecutables** porque `hermes/` no existe aún.

---

## 1. Resumen

| Categoría | Disponible hoy | Pendiente de Code Generation | Manual obligatorio |
|---|---|---|---|
| Revisión de documentos | ✅ | — | ✅ |
| Lint estándares de diseño | ✅ (parcial) | — | — |
| Audit / trazabilidad | ✅ | — | — |
| Tests automatizados | ❌ | ✅ (5 tipos documentados) | — |
| Sign-off de stakeholders | — | — | ✅ |
| Compliance auditoría | — | Fase 2 | ✅ |

---

## 2. Validaciones disponibles HOY

Se pueden correr ahora mismo sobre el repo en su estado actual (docs 100%, código 0%).

### 2.1 Revisión humana de documentos

- **Mecanismo:** lectura crítica del usuario o stakeholder sobre archivos Markdown.
- **Alcance:** `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `docs/*.md`, `specs/*.md`, `ai-dlc/aidlc-docs/**/*.md`.
- **Bloqueante:** sí — los gates AI-DLC requieren aprobación explícita ("Approve & Continue" / "Continue to Next Stage") antes de avanzar.
- **Evidencia:** registro literal del input del usuario en `ai-dlc/aidlc-docs/audit.md`.

### 2.2 Audit log AI-DLC

- **Mecanismo:** append-only en `ai-dlc/aidlc-docs/audit.md` con timestamp ISO 8601 + raw user input.
- **Cobertura:** cada decisión, cada gate, cada aprobación, cada respuesta del usuario y respuesta del AI.
- **Cómo validarlo:** `tail -n 50 ai-dlc/aidlc-docs/audit.md` para ver últimas decisiones; `grep "Approval Received"` para listar aprobaciones.
- **Bloqueante:** sí — el workflow AI-DLC obliga a registrar antes de proceder. Estado del workflow está en `aidlc-state.md`.

### 2.3 Lint Mermaid (manual)

- **Mecanismo:** parseo manual de bloques ` ```mermaid ` en docs antes de commit, según `common/content-validation.md` del workflow AI-DLC.
- **Alcance:** los diagramas Mermaid en application-design.md, services.md, deployment-architecture.md, etc.
- **Bloqueante:** sí (per AI-DLC rule) — un diagrama roto no debe entrar a la documentación.
- **Comando:** Mermaid no tiene CLI lint oficial; usar editor online <https://mermaid.live> para validar antes de commit.

### 2.4 Lint Google DESIGN.md

- **Mecanismo:** linter oficial del estándar.
- **Comando:**
  ```bash
  npx @google/design.md lint DESIGN.md
  ```
- **Estado:** comando **no ejecutado todavía** sobre `DESIGN.md v0`. Debe correrse antes del primer commit que lo afecte.
- **Bloqueante:** recomendado (no obligatorio aún) — el archivo declara querer cumplir el estándar (DESIGN.md §0 header).
- **Salida esperada:** estructura válida + referencias no rotas + alertas de contraste declarado.

### 2.5 Verificación de referencias rotas (Markdown links)

- **Mecanismo:** revisión manual o tools como `markdown-link-check` (npm).
- **Alcance:** todos los links relativos en `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `docs/*`.
- **Estado:** no automatizado hoy. Puede correrse ad-hoc:
  ```bash
  npx markdown-link-check PRODUCT.md DESIGN.md AGENTS.md
  ```
- **Bloqueante:** no obligatorio MVP. Recomendado pre-commit cuando los archivos crecen.

### 2.6 Verificación de coherencia con `aidlc-state.md`

- **Mecanismo:** revisar que cualquier cambio en docs AI-DLC esté reflejado en `aidlc-state.md` (Current Status + Stage Progress).
- **Alcance:** archivos en `ai-dlc/aidlc-docs/`.
- **Bloqueante:** sí (per AI-DLC rule "Plan-Level Checkbox Enforcement").
- **Cómo:** después de modificar un plan file o generar artefactos, actualizar `[x]` en checklists + actualizar Current Status.

---

## 3. Validaciones documentadas pero NO ejecutables

Estos mecanismos están **planificados y documentados** en `ai-dlc/aidlc-docs/construction/build-and-test/` pero **NO se pueden correr hoy** porque no existe `hermes/` con código.

> **Cuándo se activan:** cuando se ejecute Code Generation de cualquier Unit, los planes de CG deben incluir creación de los archivos test enumerados en cada `nfr-design/logical-components.md`.

### 3.1 Unit tests (Vitest + fast-check PBT)

- **Stack:** Vitest + fast-check (Property-Based Testing).
- **Coverage target:** 70% lines (Q4 NFR-R U1 = B).
- **Volumen esperado MVP:** ~80-100 unit tests + ~10 PBT tests.
- **Localización futura:** `hermes/tests/unit/**` + `hermes/tests/pbt/**`.
- **Comando futuro:**
  ```bash
  cd hermes && npm test
  npm run test:coverage
  npm run test:pbt
  ```
- **Doc fuente:** [unit-test-instructions.md](../ai-dlc/aidlc-docs/construction/build-and-test/unit-test-instructions.md).
- **Bloqueante futuro:** sí (pass rate 100%, coverage ≥70%) — gates documentados en build-and-test-summary.md §3.3.

### 3.2 Integration tests (Vitest + Supertest + Postgres + mailhog reales)

- **Stack:** Vitest + Supertest sobre `docker compose up` con Postgres + mailhog reales (no mocks).
- **Volumen esperado MVP:** ~20-30 tests cubriendo 5 escenarios U1 + 5 U2 + 16 U3.
- **Localización futura:** `hermes/tests/integration/**`.
- **Comando futuro:**
  ```bash
  npm run up               # docker compose
  npm run migrate          # 11 migrations
  npm run test:integration
  ```
- **Doc fuente:** [integration-test-instructions.md](../ai-dlc/aidlc-docs/construction/build-and-test/integration-test-instructions.md).
- **Duración estimada:** ~60-120 segundos.
- **Bloqueante futuro:** sí — antes de merge a main (cuando se introduzca PR workflow) y antes de Demo Day.

### 3.3 Performance tests (autocannon soft validation)

- **Stack:** autocannon (HTTP load testing) + Vitest bench (microbench funciones puras).
- **Cobertura:** 7 escenarios HTTP + 3 microbench, contra SLOs heredados de NFR-R.
- **SLOs a validar:**
  - `/widget/config` p95 <50 ms con 50 conn concurrentes
  - `/chat` happy path p95 <8 s
  - `/chat` con handoff trigger p95 <1 s
  - `/admin/dashboard/kpis` p95 <3 s con seed
  - Login p50 250-400 ms (no <100 ms — indica bcrypt mal config)
- **Comando futuro:**
  ```bash
  npm run test:performance
  ```
- **Doc fuente:** [performance-test-instructions.md](../ai-dlc/aidlc-docs/construction/build-and-test/performance-test-instructions.md).
- **Bloqueante futuro:** pre-Demo Day check; ad-hoc si algo se siente lento en QA.

### 3.4 Build verification

- **Stack:** `tsc` (TypeScript compiler) + `npm run build` + docker compose health checks.
- **Comando futuro:**
  ```bash
  npm install
  npm run up                # 3 containers healthy
  npm run migrate           # 11 migrations sin error
  npm run seed              # Patprimo + alert_rules
  npm run create-bm         # admin user
  curl http://localhost:3000/health/ready   # debe retornar 200
  ```
- **Doc fuente:** [build-instructions.md](../ai-dlc/aidlc-docs/construction/build-and-test/build-instructions.md).
- **Bloqueante futuro:** sí — cero errores en `tsc`, todos los containers healthy.

### 3.5 Lint + audit del código

- **Stack:** ESLint + Prettier (pre-configurados según Unit 1 CG plan, sin ejecutar todavía).
- **Comando futuro:**
  ```bash
  npm run lint
  npm run typecheck
  npm audit          # zero high+ vulnerabilities
  ```
- **Bloqueante futuro:** sí — cero errores lint, cero `high+` en `npm audit`.

---

## 4. Validaciones humanas obligatorias

No se pueden automatizar. Requieren intervención de stakeholders específicos.

### 4.1 Sign-off del Brand Manager Patprimo

- **Dueño:** P4 Brand Manager Patprimo (per [personas.md](../ai-dlc/aidlc-docs/inception/user-stories/personas.md)).
- **Cuándo:** Semana 2 stakeholder engagement (ISB §2). Pre-launch MVP.
- **Qué se firma:**
  - System prompt v1 (voz Patprimo).
  - 10-20 ejemplos few-shot de respuestas representativas.
  - Customer-facing name (ej. tentativo "Sofía de Patprimo").
  - Decisiones visuales brand-specific (paleta exacta del brand guide formal vs as-observed `#d32f2f`).
- **Evidencia:** firma archivada + entrada en audit.md.
- **Si veta:** Riesgo §8 №5 del ISB — bloquea Fase 1 launch para esa marca.

### 4.2 Sign-off de Compliance / DPO

- **Dueño:** P5 Compliance / DPO (canal `tiendashabeasdata@pash.com.co`).
- **Cuándo:** Semana 3 stakeholder engagement (ISB §2). Pre-launch MVP.
- **Qué se firma:**
  - Política de retención por país.
  - Flujo de consent gate operativo.
  - DPA con Anthropic firmado.
  - Logs auditables append-only verificados.
- **Evidencia:** documento firmado + entrada en audit.md.

### 4.3 Revisión IT / Arquitectura Salesforce

- **Dueño:** Equipo IT SFCC de PASH.
- **Cuándo:** Semana 4 stakeholder engagement (ISB §2). Pre-launch MVP.
- **Qué se valida:**
  - Permisos OCAPI / SCAPI read-only configurados.
  - Capacidad SFCC sin degradación de storefront.
  - Plan de rollback si la integración falla.
- **Evidencia:** ticket de IT + entrada en audit.md.

### 4.4 Demo Day operational checklist (2026-06-09)

Lista detallada en [build-and-test-summary.md §4](../ai-dlc/aidlc-docs/construction/build-and-test/build-and-test-summary.md). Resumen:

- **Pre-demo (≤1h antes):** build verification + tests + backup + smoke check.
- **Durante demo:** subir `traffic_percentage` 5% → 25% → 100% según vaya bien.
- **Plan B:** kill switch si algo falla mid-show.
- **Post-demo:** backup + export KPIs a stakeholders.

### 4.5 Revisión visual UI

- **Mecanismo:** validación manual click-through sobre widget cliente + BM UI + admin UI.
- **Cuándo:** pre-Demo Day + cuando se cambien componentes.
- **Cobertura:**
  - Usabilidad widget (ICP §1.5 mobile-first)
  - Click-through admin BM
  - Renderizado correcto en mobile + desktop (chrome modern)
- **Bloqueante:** sí — no hay test automatizado de UI en MVP (e2e Playwright es Fase 2).

### 4.6 Revisión de calidad del LLM (Brand voice + accuracy)

- **Mecanismo:** eval offline manual del Brand Manager Patprimo sobre muestra semanal de conversaciones.
- **Cuándo:** después de launch MVP, semanal.
- **Cobertura:**
  - Tono coherente con voz aprobada (PRODUCT.md §5).
  - No alucinaciones (toda info dinámica desde tool call).
  - No prompt injection exitoso.
  - No promesas vinculantes (Moffatt + Chevrolet).
- **Threshold de éxito:** ≥90% muestra semanal aprobada sin cambios (per P4 success signal en PRODUCT.md §9).

---

## 5. Gaps conocidos (sin disponibilidad ni plan inmediato)

Validaciones que **no tenemos** y que vale la pena considerar en Fase 2.

| Gap | Justificación de exclusión MVP | Candidate Fase 2 |
|---|---|---|
| **markdownlint** (lint Markdown automatizado) | No bloqueante para Demo Day | Sí — útil cuando equipo crezca |
| **axe-core** (a11y automatizado) | Validación manual WCAG AA es suficiente MVP | Sí — pre-launch público amplio |
| **Visual regression testing** (Percy / Chromatic) | UI cambia poco en MVP | Sí — cuando UI se estabilice |
| **Cross-browser E2E** (Playwright) | Solo desktop modern per Q4 NFR-R U2 | Sí — antes de Fase 2 multi-país |
| **Mobile E2E real device** | Manual con DevTools mobile mode es suficiente MVP | Sí — Fase 2 |
| **Penetration testing profesional** | Out-of-scope MVP per build-and-test-summary.md §7 | Sí — pre-launch público amplio |
| **Compliance audit formal Ley 1581** | Sign-off Compliance manual es suficiente MVP | Sí — anual |
| **Disaster recovery tests** | Backup script existe; failover no | Sí — pre-Fase 2 |
| **Mutation testing** (Stryker) | Coverage 70% lines es suficiente MVP | Tal vez Fase 2 |
| **Contract tests** (Pact / consumer-driven) | Solo 1 consumer del API (widget propio) | Si se agregan más consumers en Fase 2 |
| **CI/CD pipeline GitHub Actions** | OD-8 cerrada como Fase 2 candidate | Sí — equipo >1 dev |
| **Real Bedrock cost-validation runs** | Estimación bottom-up suficiente MVP | Sí — pre-launch público |
| **Brand voice consistency automatizada** | Sign-off Brand Manager semanal manual | Tal vez — eval framework dedicado |

---

## 6. Validation matrix por estado del proyecto

| Estado | Validaciones operativas |
|---|---|
| **AI-DLC docs (estado actual)** | Revisión humana + audit log + lint Mermaid manual + lint DESIGN.md |
| **Post Code Generation U1** | Lo anterior + Vitest unit + PBT + build verification (`tsc`, docker compose up) + lint |
| **Post Code Generation U1+U2+U3** | Lo anterior + Vitest integration + performance soft + audit npm |
| **Pre-launch MVP** | Lo anterior + sign-off Brand Manager + sign-off Compliance + revisión IT + revisión visual UI + Demo Day checklist |
| **Post-launch MVP** | Lo anterior + revisión semanal LLM quality + monitoreo KPIs + alertas en producción |

---

## 7. Cómo proponer una nueva validación

1. Identificar la categoría: ¿automatizable o manual obligatoria?
2. Si automatizable y bloqueante, agregar a `aidlc-docs/construction/build-and-test/` con su instruction doc.
3. Si manual y bloqueante, agregar a §4 con dueño explícito.
4. Si es un gap conocido pero no inmediato, agregar a §5 con justificación.
5. Actualizar la `validation matrix` §6 si cambia el conjunto operativo por estado.

---

## 8. Validation State

- **Versión actual:** v0
- **Última actualización:** 2026-05-26
- **Próxima revisión obligatoria:** cuando arranque Code Generation de cualquier Unit (activar §3 como ejecutable).

### Items `[TBD]`

| # | Item | Bloqueante para | Dueño |
|---|---|---|---|
| 1 | Correr `npx @google/design.md lint DESIGN.md` y registrar output | Cierre v1 DESIGN.md | Equipo Hermes |
| 2 | Definir si markdownlint y markdown-link-check entran como pre-commit hooks | Hygiene del repo | Equipo Hermes |
| 3 | Procedimiento exacto de Code Generation con activación de §3 | Reactivar Code Generation | Decisión del usuario |

---

*Validations de Hermes — v0 — Hardcore AI 30X Cohorte 2 — Estación 6*
