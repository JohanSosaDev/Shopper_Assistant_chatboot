# AGENTS.md — Hermes

Contrato operativo cross-tool entre humano y agentes de IA. Estándar abierto leído por Claude Code, Cursor, Codex, OpenHands, Antigravity y cualquier agente que abra este repo.

Si eres un agente entrando al repo por primera vez: lee este archivo primero. Te dice cómo navegar, qué tocar, qué validar y qué reglas respetar.

## Quick start (orden de lectura para arrancar)

1. **AGENTS.md** (este archivo) — convenciones del repo.
2. **[STACK.md](STACK.md)** — arnés, modelo, stack auxiliar.
3. **[PRODUCT.md](PRODUCT.md)** — voz, usuarios, anti-referencias.
4. **[DESIGN.md](DESIGN.md)** — sistema visual con tokens.
5. **[VALIDATION.md](VALIDATION.md)** — comandos de verificación.
6. **`ai-dlc/aidlc-docs/aidlc-state.md`** — estado actual del workflow AI-DLC.
7. **`ai-dlc/prd.md`** — Product Requirements Document consolidado.

Solo después de los anteriores, lee specs por unidad si vas a trabajar en alguna:
- `ai-dlc/aidlc-docs/construction/unit1-core-agente/` (Core Agente)
- `ai-dlc/aidlc-docs/construction/unit2-knowledge-brand-voice/` (Brand Voice)
- `ai-dlc/aidlc-docs/construction/unit3-handoff-convivencia/` (Handoff + Despliegue Gradual)

## Estructura del repo

```
Shopper_Assistant_chatboot/
├── README.md                        Punto de entrada para humanos
├── AGENTS.md                        Este archivo (cross-tool)
├── STACK.md                         Arnés + modelos
├── PRODUCT.md                       Voz, usuarios, anti-referencias
├── DESIGN.md                        Sistema visual con tokens
├── VALIDATION.md                    Comandos de verificación
│
├── .claude/                         Config Claude Code project-level
│   ├── settings.local.json          Permisos y env vars locales
│   ├── hooks/                       PostToolUse, PreToolUse hooks
│   └── skills/                      Skills project-level (vacío; usar user-level)
│
├── ai-dlc/                          AI-DLC framework + docs (NO tocar el código aquí)
│   ├── CLAUDE.md                    Reglas del framework AI-DLC (cómo proceder por fases)
│   ├── prd.md                       PRD consolidado
│   ├── .aidlc-rule-details/         Detalles de fases (Inception, Construction, Operations)
│   └── aidlc-docs/                  Artefactos generados
│       ├── aidlc-state.md           Estado actual del workflow
│       ├── audit.md                 Log append-only de cada interacción
│       ├── blockers/                Documentos de bloqueos resueltos
│       ├── inception/               6 artefactos completos
│       └── construction/            3 unidades × 4 stages + build-and-test
│
├── specs/                           Specs adicionales fuera de AI-DLC
│   └── prd.md                       Copia o link del PRD
│
├── docs/                            Documentación E1-E3 (Hardcore AI program)
│   ├── internal-solution-brief.md
│   ├── icp.md
│   ├── deep-research-validacion.md
│   └── deep-research-critica.md
│
└── hermes/                          ⚠️ NO EXISTE TODAVÍA. Código aplicación se generará aquí
    ├── src/                         Backend TS
    ├── widget/                      Vanilla TS bundle del widget cliente
    ├── migrations/                  SQL migrations 001..010
    ├── tests/                       Vitest + fast-check + Supertest
    ├── fixtures/                    Demo data + SFCC mock
    ├── docker-compose.yml
    └── package.json
```

### Reglas de qué tocar

| Carpeta | Quién la modifica | Cuándo |
|---|---|---|
| `hermes/**` | Agente durante CG | Code Generation activa |
| `ai-dlc/aidlc-docs/audit.md` | Framework AI-DLC | Append-only, cada interacción AI-DLC |
| `ai-dlc/aidlc-docs/aidlc-state.md` | Framework AI-DLC | Cuando avanza un stage |
| `ai-dlc/aidlc-docs/inception/**` | Solo dentro de workflow Inception | Inception está COMPLETA. NO modificar salvo error encontrado |
| `ai-dlc/aidlc-docs/construction/**` | Solo dentro de workflow Construction | Construction docs están al 100%. NO modificar diseño aprobado |
| `ai-dlc/CLAUDE.md` y `.aidlc-rule-details/` | NO MODIFICAR | Son las reglas del framework AI-DLC, vendor file |
| `PRODUCT.md`, `DESIGN.md`, `STACK.md`, `AGENTS.md`, `VALIDATION.md` | Equipo Hermes | Refinamiento continuo |
| `.claude/hooks/` | Equipo Hermes | Setup inicial + ajustes operativos |

**Regla crítica**: `ai-dlc/aidlc-docs/construction/` contiene los specs aprobados de las 3 unidades. **NO los modifiques durante Code Generation**. Si encuentras un error o ambigüedad, regístralo como nota operativa en memoria (ver [memory/](C:/Users/sosab/.claude/projects/C--Users-sosab-source-repos-Shopper-Assistant-chatboot/memory/MEMORY.md)) y resuélvelo después del MVP.

## Distinción crítica: `ai-dlc/CLAUDE.md` vs este archivo

- **`ai-dlc/CLAUDE.md`**: las reglas del framework AI-DLC (cómo proceder por fases Inception → Construction → Operations). Aplica solo cuando estás dentro del flujo AI-DLC del framework.
- **`AGENTS.md`** (este archivo): cómo navegar **este proyecto Hermes específico**. Aplica **siempre** que un agente entre al repo, independiente de si está en AI-DLC o no.

Si vienes a hacer Code Generation y AI-DLC dispara, ambos aplican.

## Convenciones de código

### TypeScript

- **Strict mode siempre**: `tsconfig.json` con `strict: true`, `noImplicitAny`, `strictNullChecks`.
- **Sin `any` salvo justificado**: agregar `// eslint-disable-next-line @typescript-eslint/no-explicit-any` con razón inline.
- **Branded types** para valores semánticamente distintos: `type RedactedText = string & { __brand: 'redacted' }` (R-PII-4 Unit 1).
- **Result types** para errores recuperables: `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`.

### Naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Variables, funciones | camelCase | `handleTurn`, `customerIdHash` |
| Tipos, interfaces | PascalCase | `TurnInput`, `IConversationService` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_TURNS_PER_MINUTE`, `BEDROCK_REGION` |
| Tablas SQL | snake_case | `turn_log_audit`, `system_config_audit` |
| Columnas SQL | snake_case | `customer_id_hash`, `created_at` |
| Archivos TS | kebab-case | `conversation-service.ts`, `m1-conversation.plugin.ts` |
| Archivos SQL migration | `000N_unit{N}_{feature}.sql` | `0001_unit1_base.sql` |
| Branches Git | N/A — main only | (ver Reglas operativas) |

### Patrones

- **Plugin pattern Fastify**: cada módulo M1–M8 es un plugin que registra rutas + decorators. Ver Unit 1 components.md §M1.
- **Services con interfaces**: cada service implementa una interface declarada en `models/`. Permite mocking limpio en unit tests.
- **Repositories para DB access**: services nunca llaman `pg` directo. Repositories aislados con queries explícitas.
- **Zod schemas en `models/`**: tipos TS compartidos derivados de Zod (`z.infer<typeof Schema>`).
- **Append-only enforced en DB role**: el rol `hermes_app` no tiene `DELETE`/`UPDATE` en tablas audit (SECURITY-13). Separación con `hermes_retention` para purga.

### Validación

- **Input validation**: Zod en cada controller, Step 1 antes de invocar service (SECURITY-05).
- **Output handling**: nunca exponer stack traces ni queries SQL al cliente (SECURITY-09 + R-ERR-2).
- **PII**: ningún cleartext en `turn_log_audit`. Forzado por tipo (`RedactedText`) en `LoggerService.logTurn()`.

### Frontend específicamente

- **Widget vanilla TS**: sin React, sin frameworks. Plain CSS BEM scoped. Bundle target ≤30kb gzipped + ≤5kb CSS (Q5 FD Unit 1).
- **BM UI EJS**: server-rendered con plantillas. JS progresivo (no SPA).
- **Componentes referencian tokens de [DESIGN.md](DESIGN.md)**: no hard-code colores, espaciados, tipografías.

## Comandos clave (post Code Generation)

Estos comandos van a existir en `hermes/package.json` cuando Code Generation se ejecute. Hoy NO existen porque CG está pausado. Ver [VALIDATION.md](VALIDATION.md) para detalle completo.

### Setup

```bash
npm ci                                    # Install dependencies (lock file enforced)
npm run migrate                           # Aplica migraciones SQL 0001..0010
npm run seed                              # Seed Patprimo BrandConfig + 5 alert rules builtin
npm run create-bm -- --email <email>      # Crea Brand Manager user (admin script, no self-signup)
```

### Run

```bash
npm run dev                               # Hot reload
npm run up                                # docker compose up con healthcheck
npm run down                              # docker compose down
npm run logs                              # tail logs de hermes container
```

### Validate

```bash
npm run lint                              # ESLint + Prettier
npm run typecheck                         # tsc --noEmit
npm test                                  # Vitest unit + PBT
npm run test:integration                  # Supertest + Postgres + mailhog reales
npm run test:coverage                     # Coverage ≥70% lines target
npm run build                             # tsc build + esbuild widget bundle
```

### Smoke

```bash
npm run smoke:caso1                       # Turn end-to-end estado pedido
npm run smoke:handoff                     # Trigger sentiment + email mailhog
npm run smoke:brand-flow                  # CRUD versionado Unit 2
curl http://localhost:3000/health/ready   # Quick readiness check
```

### Backup / runbook

```bash
npm run backup -- pre-demo-day-2026-06-09
npm run backup -- post-demo-day-2026-06-09
```

## Reglas operativas

### Git

- **Trabaja siempre en `main`**. No crear feature branches para este repo (per [feedback_branching](memory/feedback_branching.md)).
- **Commits descriptivos**: prefijo por unidad cuando aplica (`U1: add ConversationService`, `docs: refactor PRODUCT`).
- **No commitear secretos**: `.env` está en `.gitignore`. Si secretos se commitean por accidente, rotar inmediatamente (ver STACK.md §6.3).

### Permisos del agente

- **Pedir confirmación humana antes de**: transición de unidad, generar código de una nueva Unit, rollback/commit de cambios mayores, decisiones de arquitectura importantes (per [feedback_aidlc_pacing](memory/feedback_aidlc_pacing.md)).
- **Operación autónoma OK para**: ediciones quirúrgicas de docs, fixes de typos, agregar tests, refactor interno de una función.

### Hooks

- **PostToolUse**: lint + format automático tras cada Edit/Write (configurado en `.claude/hooks/`).
- **PreCommit** (cuando exista): lint + typecheck + unit tests rápidos.

### Memoria cross-session

Notas operativas activas en `~/.claude/projects/C--Users-sosab-source-repos-Shopper-Assistant-chatboot/memory/`:

| Nota | Propósito |
|---|---|
| `feedback_branching` | main only, no feature branches |
| `feedback_aidlc_pacing` | preguntar antes de decisiones importantes |
| `feedback_demo_day_priority` | proteger 2026-06-09 sobre scope expansion |
| `project_demo_day_plan_b` | mock SFCC + fixtures + video grabado |
| `project_sfcc_integration_plan` | cartridge `int_hermes` + Cloudflare Tunnel |
| `project_skills_installed` | 19 skills user-level disponibles |
| `project_widget_audit_findings` | 4 gaps + 6 ambigüedades para resolver durante CG |
| `blocker_oct8ne_status` | resuelto + refactor coherencia Inception |

Estas notas tienen autoridad operativa equivalente a este archivo. **Léelas antes de hacer cambios que las afecten.**

## Skills disponibles (19 user-level)

Invocar explícitamente con `/<skill>` o dejar que el agente las dispare por descripción. Mapeo a tareas:

| Tarea | Skill recomendada |
|---|---|
| Diseñar/auditar componente del widget o BM UI | `web-design-guidelines`, `make-interfaces-feel-better`, `userinterface-wiki` |
| Audit visual completo | `impeccable audit` |
| Polish final de UI | `impeccable polish` |
| WCAG accessibility audit | `accessibility` |
| Performance optimization | `core-web-vitals`, `performance` |
| Code review pre-commit | `best-practices`, `code-review` |
| Security audit del MVP | `security-review`, `best-practices` |
| Verificar que algo corre | `verify`, `run` |
| Generar imágenes (Fase 2 si aplica) | `imagegen` |

Ver lista completa en [memory/project_skills_installed.md](memory/project_skills_installed.md).

## Restricciones específicas

### Demo Day 2026-06-09

**SCOPE FREEZE**. No agregar features nuevas, no cambiar arquitectura, no expandir multi-marca más allá de Patprimo (per [feedback_demo_day_priority](memory/feedback_demo_day_priority.md)). Cualquier idea nueva se documenta como Fase 2.

### Integración SFCC

Solo en **sandbox personal de Johan** (cloud SFCC). NO deploy a staging/prod PASH. Cartridge `int_hermes` vive solo en esa sandbox durante el demo y queda en stock hasta Fase 2 (per [project_sfcc_integration_plan](memory/project_sfcc_integration_plan.md)).

### Multi-marca

Solo Patprimo en MVP. Seven Seven, Ostu, Atmos están definidas en [DESIGN.md](DESIGN.md) `brands` para Fase 2 pero el RolloutGate las fuerza a `traffic_percentage = 0` mientras `customer_facing_name` siga siendo placeholder.

### Code Generation status

Actualmente **diferido**. Diseño AI-DLC al 100% (3 unidades × 4 design stages + Build and Test instructions). Activar solo bajo confirmación explícita del operador. Cuando se active:
1. Empezar por Unit 1 (Core Agente).
2. Incluir `SFCC_MODE` switchable desde día 1 (mock + real) per Plan B Demo Day.
3. Aplicar findings de [project_widget_audit_findings](memory/project_widget_audit_findings.md) durante CG del widget.

## Cuando pedir ayuda humana

- Decisión arquitectónica no cubierta en AI-DLC docs.
- Conflicto entre dos docs (ej. NFR-R Unit 1 dice X, NFR-D dice Y).
- Credenciales o accesos faltantes (Bedrock, SFCC, SMTP).
- Cualquier acción destructiva (drop tables, force push, delete branches).
- Cuando un fix requiere modificar specs `aidlc-docs/construction/**`.

## Fuentes de contexto

- [STACK.md](STACK.md) — qué herramientas y modelos.
- [PRODUCT.md](PRODUCT.md) — qué construir y para quién.
- [DESIGN.md](DESIGN.md) — cómo se ve.
- [VALIDATION.md](VALIDATION.md) — cómo verificar.
- [README.md](README.md) — entrada para humanos.
- `ai-dlc/prd.md` — PRD consolidado.
- `ai-dlc/CLAUDE.md` — reglas del framework AI-DLC (no del proyecto).
- `ai-dlc/aidlc-docs/aidlc-state.md` — estado actual del workflow.
- Memorias cross-session: `~/.claude/projects/.../memory/MEMORY.md`.
