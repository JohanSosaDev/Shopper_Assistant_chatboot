# AGENTS.md — Hermes

> **Propósito de este archivo:** Contrato de operación para agentes de IA (Claude Code, Codex, OpenHands, Factory, OpenCode, etc.) y para humanos que entran al repo. Define **qué es Hermes**, **cómo está organizado el repo**, **cómo se trabaja en él** y **qué preferencias del usuario son obligatorias**.
>
> **Lectura previa esperada:** este archivo + [PRODUCT.md](PRODUCT.md) + [DESIGN.md](DESIGN.md). Si vas a ejecutar el workflow AI-DLC, además [ai-dlc/CLAUDE.md](ai-dlc/CLAUDE.md).

---

## 1. Project Overview

### 1.1 Qué es Hermes

Hermes es un **agente conversacional de IA** para atención al cliente del grupo **PASH SAS** (Patprimo, Seven Seven, Ostu, Atmos) sobre **Salesforce Commerce Cloud**, con personalidad propia por marca, datos transaccionales en tiempo real y cobertura 24/7.

**Codename interno:** Hermes. Customer-facing names por marca (`[TBD — Brand Manager sign-off]`).

### 1.2 Contexto del programa

Este repo es el deliverable del programa **Hardcore AI 30X — Cohorte 2** (4 semanas, 12 estaciones). Demo Day: **2026-06-09**. Estado actual: **Estación 6 (Implementando)**.

### 1.3 Estado del proyecto (al 2026-05-26)

| Dimensión | Estado |
|---|---|
| **AI-DLC documentation** | ✅ 100% completa (Inception + Construction × 3 Units × 4 design stages + Build & Test docs) |
| **Application code** | ❌ 0% — Code Generation diferido para las 3 Units. **NO existe carpeta `hermes/` con código aún.** |
| **PRODUCT.md / DESIGN.md** | ✅ v0 (este turn — Estación 6) |
| **AGENTS.md (este archivo)** | ✅ v0 (este turn — Estación 6) |
| **Operations** | Placeholder (fuera de scope MVP) |

### 1.4 Roadmap MVP

- **Fase 1 (4 semanas):** Patprimo Colombia, chat web SFCC, 2 intents (estado de pedido + disponibilidad).
- **Fase 2 (post-MVP):** otras 3 marcas, WhatsApp, devoluciones, sentimiento avanzado.
- **Fase 3 (6-12 meses):** multi-país (Ec, Gt, CR, Pa), recomendación predictiva.

Detalles en [docs/internal-solution-brief.md §9](docs/internal-solution-brief.md).

---

## 2. Technology Stack

Decisiones cerradas (referencia: `ai-dlc/aidlc-docs/aidlc-state.md` + `tech-stack-decisions.md` por Unit).

| Capa | Decisión | Estado |
|---|---|---|
| **Lenguaje** | TypeScript + Node 20 | Q4 = C |
| **Framework HTTP** | Fastify (monolithic plugin architecture) | ADR-1 |
| **Validación** | Zod + branded types | ADR-5 |
| **DI / wiring** | `fastify.decorate` | ADR-2 |
| **DB** | PostgreSQL + pgvector (single instance) | Q5 = B |
| **Migrations** | `postgres-migrations` (cierra OD-2) | NFR-R U1 |
| **LLM core** | Claude Haiku 4.5 vía AWS Bedrock (region `sa-east-1`) | ISB §7 |
| **SDK Bedrock** | `@anthropic-ai/bedrock-sdk` | ADR-4 |
| **Frontend widget** | Vanilla JS bundle ~30 KB, sin frameworks | Unit 1 FD Q5 |
| **Admin UI** | EJS templates server-rendered | Unit 3 NFR-D |
| **Email (handoff)** | nodemailer 6.x + mailhog en dev | Unit 3 NFR-D |
| **Alerting** | Slack webhook único + sin breaker (no silenciar críticas) | Unit 3 NFR-D |
| **Logging** | pino con structured JSON | Unit 1 NFR-D |
| **Testing — unit** | Vitest + fast-check (PBT) | Q4 NFR-R U1 |
| **Testing — integration** | Vitest + Supertest + Postgres+mailhog reales | Build & Test |
| **Testing — performance** | autocannon (soft validation) | Build & Test |
| **Deployment** | Docker Compose local-only (MVP) | Q7 = A |
| **Code location** | `hermes/` subfolder (sibling de `ai-dlc/`) | Q6 = C |

**Lo que NO se usa (rechazado explícitamente):**

- Redis (Postgres es suficiente para conversation state MVP)
- ORM (raw `pg` driver + SQL manual — ADR-3)
- Frameworks frontend (vanilla JS deliberado)
- Playwright / E2E en MVP (Vitest+Supertest cubre integration)
- GitHub Actions CI (Fase 2 candidate — OD-8)
- AWS Lambda / serverless en MVP (Docker Compose local)

---

## 3. Repository Structure

### 3.1 Estado actual del repo

```
Shopper_Assistant_chatboot/
├── AGENTS.md                  # Este archivo
├── PRODUCT.md                 # Memoria de producto (audiencia, propósito, voz)
├── DESIGN.md                  # Memoria visual (tokens, componentes, anti-patrones)
├── README.md                  # Resumen del proyecto + links a docs
├── ai-dlc/                    # Workflow AI-DLC (NO mover este contenido)
│   ├── CLAUDE.md              # Workflow runtime AI-DLC (reglas para el agente)
│   ├── prd.md                 # PRD input al workflow (88 KB)
│   └── aidlc-docs/            # Documentación producida por AI-DLC
│       ├── aidlc-state.md     # Source-of-truth del progreso AI-DLC
│       ├── audit.md           # Source-of-truth de decisiones (append-only)
│       ├── blockers/          # Blockers documentados (1 resuelto: Oct8ne)
│       ├── inception/         # Fase Inception (workspace, requirements, stories, app design, units)
│       └── construction/      # Fase Construction (3 Units × 4 design stages + build & test)
├── docs/                      # Documentación de producto / negocio
│   ├── internal-solution-brief.md
│   ├── icp.md
│   ├── deep-research-validacion.md
│   └── deep-research-critica.md
└── specs/                     # Specs canónicos
    └── prd.md
```

### 3.2 Carpetas que se crearán cuando exista código

```
hermes/                        # Application code — NO existe aún (Code Generation diferido)
├── src/                       # TypeScript source
├── tests/                     # Unit + PBT + Integration
├── migrations/                # postgres-migrations forward-only
├── docker-compose.yml
├── package.json
└── ...
```

Estructura detallada cuando arranque Code Generation: `ai-dlc/aidlc-docs/inception/application-design/application-design.md` + `unit-of-work.md`.

### 3.3 Reglas de ubicación de archivos

- **Application code:** SIEMPRE en `hermes/` (no en `ai-dlc/aidlc-docs/`).
- **Documentación de producto:** `PRODUCT.md` + `DESIGN.md` + `docs/`.
- **Documentación AI-DLC:** `ai-dlc/aidlc-docs/` ÚNICAMENTE.
- **PRDs / specs canónicos:** `specs/`.
- **Memoria del usuario (Claude Code):** `~/.claude/projects/...` (fuera del repo, no versionada).

---

## 4. Operating Mode

### 4.1 Cómo coexisten las fuentes de instrucciones

Hermes tiene **5 capas de instrucciones**. Cuando hay conflicto, se resuelve **antes** de ejecutar acción sensible.

| Prioridad | Fuente | Alcance |
|---|---|---|
| 1 (máxima) | System / harness | Reglas del modelo y del cliente (Claude Code, Codex, etc.) |
| 2 | **Memoria del usuario** (`~/.claude/projects/.../memory/`) | Preferencias persistentes cross-sesión del usuario |
| 3 | **AGENTS.md (este archivo)** | Reglas del repo Hermes para cualquier agente |
| 4 | **ai-dlc/CLAUDE.md** | Workflow AI-DLC (solo aplica cuando se ejecuta AI-DLC) |
| 5 | **PRODUCT.md + DESIGN.md** | Criterio de producto + memoria visual |
| 6 | Conversación / prompt del usuario | Tarea específica de la sesión |

### 4.2 Cuándo aplica `ai-dlc/CLAUDE.md`

Solo cuando el usuario explícitamente está ejecutando el workflow AI-DLC (Inception, Construction, Build & Test). Para tareas fuera de ese workflow (refactor de docs, ejecución de Estación 6 deliverables, exploración de código), **NO aplica**.

Estado AI-DLC actual: **docs 100% completos, Operations placeholder**. El workflow está esencialmente cerrado salvo que se reactive Code Generation.

### 4.3 Cuándo aplica PRODUCT.md / DESIGN.md

- Cuando se genere copy customer-facing → PRODUCT.md §5 (voz).
- Cuando se genere UI, slides, mockups, ilustración → DESIGN.md (tokens, componentes, anti-patrones).
- Cuando se tome una decisión de scope o producto → PRODUCT.md §7.

---

## 5. User Preferences (obligatorias)

Estas preferencias del usuario son **estables y obligatorias** para cualquier agente que trabaje en el repo. Fueron pactadas en sesiones previas y persisten en memoria del usuario; se documentan aquí para que **otros arneses** (Codex, OpenHands, Factory) también las vean.

### 5.1 Branching y commits

- **Trabajar siempre directo en `main`.** No crear feature branches en este repo.
- **No hacer commits sin pedirlo el usuario explícitamente.** El usuario gestiona los commits.
- **No hacer push sin pedirlo el usuario explícitamente.**
- **No hacer rebase, force-push, reset --hard, ni ninguna operación destructiva sobre git** sin confirmación explícita.

### 5.2 AI-DLC pacing

Reglas de ritmo durante el workflow AI-DLC (aplican cada vez que se reactive):

- **Preguntar antes de transitar entre unidades.** Antes de pasar de Unit 1 a Unit 2, o de FD a NFR-R, confirmar con el usuario.
- **Preguntar antes de generar código.** Code Generation es un punto de no-retorno; siempre confirmar.
- **Preguntar antes de rollback o commit.** Operaciones destructivas o de publicación requieren confirmación.
- **Preguntar antes de decisiones importantes.** Si la decisión afecta el alcance, el tono, la arquitectura o los stakeholders.

### 5.3 Idioma de las respuestas y documentación

- Documentación del repo: **español**.
- Conversación con el usuario: **español**.
- Código y comentarios técnicos: **inglés** (estándar industria, consistente con tooling Node/TS).

### 5.4 Estilo de comunicación

- Respuestas concisas. Sin verborrea innecesaria.
- Sin emojis decorativos.
- Sin trailing summaries cuando el usuario ya vio el cambio.
- Outlines antes de escribir documentos largos (>200 líneas).
- Preguntar antes de cargar tools que no se hayan usado en la sesión (p. ej. WebFetch a sitios externos).

### 5.5 Memoria y persistencia

- El agente usa su sistema de memoria persistente para guardar contexto del usuario, decisiones del proyecto y preferencias.
- Cuando se descubra una preferencia nueva o se resuelva un blocker, actualizar memoria.
- No re-preguntar lo que ya está en memoria a menos que se sospeche que la memoria está obsoleta.

---

## 6. Coding Standards

> **Estado:** placeholder — aplica cuando se ejecute **Code Generation** de cualquier Unit. Hoy el repo tiene 0% código.

Cuando arranque Code Generation, las reglas vienen de los docs ya producidos por AI-DLC:

| Área | Fuente canónica |
|---|---|
| Validación de inputs | Zod schemas + branded types — Unit 1 NFR-D `nfr-design-patterns.md` |
| Manejo de errores | Jerarquía de error classes — Unit 1 NFR-D + Unit 3 NFR-D (6 nuevas clases) |
| Resilience (retry / circuit breaker / timeout) | `lib/withRetry` + `lib/withCircuitBreaker` — Unit 1 NFR-D §1-2 |
| PII handling | Anonymizer (`lib/pii-anonymizer`) pre-prompt — Unit 1 NFR-D §1 + ISB §7 |
| Logging | pino structured JSON con 5 campos extendidos en Unit 3 |
| Testing | Coverage ≥70% lines (Q4 NFR-R U1 = B); PBT en funciones puras críticas |
| Migrations | Forward-only, numeradas 0001-0011 — `tech-stack-decisions.md` U3 |

**Pre-Code Generation:** revisar `application-design.md` ADR-1..7 + `tech-stack-decisions.md` de cada Unit + `nfr-design-patterns.md` de cada Unit.

---

## 7. Commands

> **Estado:** placeholder — los `npm` scripts están **documentados** en `ai-dlc/aidlc-docs/construction/build-and-test/build-instructions.md` pero **NO son ejecutables hoy** porque no existe `hermes/` con `package.json`.

Cuando arranque Code Generation, los comandos esperados serán (referencia):

```bash
# Cuando exista hermes/
cd hermes/

# Setup
npm install
npm run up                  # docker compose up (3 containers: hermes + postgres + mailhog)
npm run migrate             # postgres-migrations apply
npm run seed                # Patprimo + alert_rules builtin
npm run create-bm           # crear admin user

# Desarrollo
npm run dev                 # Fastify watch mode
npm run lint
npm run typecheck

# Tests
npm test                    # unit + PBT
npm run test:integration    # integration con docker compose up
npm run test:coverage
npm run test:performance    # autocannon soft validation

# Operación
npm run backup -- <label>   # backup 6 tablas críticas
```

Detalle completo: [ai-dlc/aidlc-docs/construction/build-and-test/build-instructions.md](ai-dlc/aidlc-docs/construction/build-and-test/build-instructions.md).

---

## 8. PR Workflow

### 8.1 Estado actual

- Trabajo directo en `main` (per preferencia del usuario §5.1).
- **No PRs en MVP.** Si en Fase 2 se cambia este modo, actualizar esta sección.
- Commits explícitos a pedido del usuario.

### 8.2 Convenciones de commit message

Formato observado en `git log` reciente:

```
<Estación N> - <stage/área>: <descripción corta>
```

Ejemplos del repo:
- `Estacion 5 - Build and Test stage: workflow AI-DLC docs 100% completo`
- `Estacion 5 - Unit 3 design completo (FD + NFR-R + NFR-D + ID): hito 100% del diseno del MVP`
- `Estacion 5 - Unit 3 FD: blocker Oct8ne resuelto + plan reformulado`

Mantener consistencia: prefijo de estación, área afectada, descripción de impacto.

### 8.3 Co-authorship

Cuando un commit se genera con asistencia del agente:

```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 9. Architecture Decisions

ADRs ya documentados. No reabrir sin nueva información sustantiva.

### 9.1 Application Design (Inception, en `application-design.md`)

| ADR | Decisión |
|---|---|
| ADR-1 | Fastify monolithic plugin architecture |
| ADR-2 | DI vía `fastify.decorate` (no contenedor custom) |
| ADR-3 | Raw `pg` driver + manual SQL (no ORM) |
| ADR-4 | `@anthropic-ai/bedrock-sdk` |
| ADR-5 | Zod para validación + branded types |
| ADR-6 | Single package (no monorepo) |
| ADR-7 | Layered folders + plugins per module |

### 9.2 Open Decisions cerradas en Construction

- **OD-1** (Fastify pattern) → ADR-1
- **OD-2** (migrations) → `postgres-migrations` (Unit 1 NFR-R)
- **OD-3** (data access) → raw pg + manual SQL (ADR-3)
- **OD-4** (LLM SDK) → bedrock-sdk (ADR-4)
- **OD-5** (frontend widget) → vanilla JS ~30 KB (Unit 1 FD Q5)
- **OD-6** (testing stack) → Vitest+Supertest (Unit 1 NFR-R)
- **OD-7** (handoff target) → stub+email recommendation (Unit 3 NFR-R)
- **OD-8** (CI/CD) → MVP local-only, GitHub Actions como Fase 2 candidate (Unit 3 Build & Test)

---

## 10. Known Issues / Gotchas

### 10.1 Estado peculiar: docs 100%, código 0%

- Cualquier referencia a archivos en `hermes/` apunta a algo que **no existe aún**.
- Los `npm` scripts documentados son **planes**, no ejecutables.
- Los tests enumerados en `build-and-test/` son **planes**, no se pueden correr.
- Los SLOs documentados en NFR-R / NFR-D son **targets**, no medidos.

### 10.2 Oct8ne resuelto (2026-05-25)

- Blocker original: ¿Oct8ne sigue activo como chat en Patprimo?
- **Resolución:** NO está activo como chat — solo se usa para envío batch outbound vía Excel manual (sin integración programática, sin widget en vivo).
- Implicación: Unit 3 plan reformulado (M8 = "Gradual Rollout" en vez de "A/B Oct8ne"). Stories E3-S3, E4-S2, MH-4, MH-9 y PRD §3/§10/§12 tienen pendiente refactor de coherencia documental (diferido, no bloquea).
- Detalle: `ai-dlc/aidlc-docs/blockers/oct8ne-validation-pending.md`.

### 10.3 Marcas y dominios

- Codename interno: **Hermes**.
- Customer-facing: `[TBD — Brand Manager sign-off]`.
- 4 marcas PASH: Patprimo, Seven Seven, Ostu, Atmos. **MVP solo Patprimo.**
- Dominios públicos:
  - Patprimo: `patprimo.com` (redirige desde `patprimo.com.co`).
  - Seven Seven, Ostu, Atmos: URLs pendientes de validar para Fase 2.

### 10.4 Context window y memoria del usuario

- La memoria del usuario contiene contexto crítico (PASH, Hardcore AI 30X, blocker Oct8ne resuelto, preferencias). Consultarla siempre al inicio de sesión.
- `MEMORY.md` lista las memorias persistentes con descripción corta.

### 10.5 AI-DLC workflow paused

- AI-DLC workflow está completo a nivel de documentación.
- Operations es placeholder.
- Code Generation está diferido para las 3 Units. Reactivarlo requiere decisión explícita del usuario.

---

## 11. References

### Documentos del producto

- [PRODUCT.md](PRODUCT.md) — Memoria de producto
- [DESIGN.md](DESIGN.md) — Memoria visual
- [docs/internal-solution-brief.md](docs/internal-solution-brief.md) — Caso de negocio
- [docs/icp.md](docs/icp.md) — ICP
- [specs/prd.md](specs/prd.md) — PRD canónico

### Workflow AI-DLC

- [ai-dlc/CLAUDE.md](ai-dlc/CLAUDE.md) — Workflow runtime (no modificar sin entender el workflow)
- [ai-dlc/prd.md](ai-dlc/prd.md) — PRD input al workflow
- [ai-dlc/aidlc-docs/aidlc-state.md](ai-dlc/aidlc-docs/aidlc-state.md) — Source-of-truth de progreso
- [ai-dlc/aidlc-docs/audit.md](ai-dlc/aidlc-docs/audit.md) — Source-of-truth de decisiones

### Construction artifacts

- [ai-dlc/aidlc-docs/inception/application-design/](ai-dlc/aidlc-docs/inception/application-design/) — Application design (5 docs)
- [ai-dlc/aidlc-docs/inception/user-stories/](ai-dlc/aidlc-docs/inception/user-stories/) — Personas + stories
- [ai-dlc/aidlc-docs/construction/unit1-core-agente/](ai-dlc/aidlc-docs/construction/unit1-core-agente/) — Unit 1 design completo
- [ai-dlc/aidlc-docs/construction/unit2-knowledge-brand-voice/](ai-dlc/aidlc-docs/construction/unit2-knowledge-brand-voice/) — Unit 2 design completo
- [ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/](ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/) — Unit 3 design completo
- [ai-dlc/aidlc-docs/construction/build-and-test/](ai-dlc/aidlc-docs/construction/build-and-test/) — 5 instruction docs (planes futuros)

### Estación 6 (Hardcore AI 30X Cohorte 2)

- Material del programa: ver `~/source/repos/30x-ai-docs/_repo_30x/c2/Estación 6/` (fuera del repo)
- Estándar Google DESIGN.md: <https://github.com/google-labs-code/design.md>
- Artículo *"Fixing Visual AI Slop"* (Trilogy AI)

---

## 12. Validation State

- **Versión actual:** v0
- **Última actualización:** 2026-05-26
- **Próxima revisión obligatoria:** cuando arranque Code Generation de cualquier Unit (revisar §6 Coding Standards y §7 Commands para activarlos).

### Cómo proponer cambios

Cambios a este `AGENTS.md` requieren:

1. Justificación en commit message referenciando PRODUCT.md, DESIGN.md, ISB, o decisión documentada en `aidlc-docs/audit.md`.
2. Si el cambio toca **User Preferences §5** → confirmar con el usuario antes (esas reglas son del usuario, no del agente).
3. Si el cambio toca **Architecture Decisions §9** → debe haber nueva evidencia o blocker que justifique reabrir ADRs.

---

*AGENTS.md de Hermes — v0 — Hardcore AI 30X Cohorte 2 — Estación 6*
