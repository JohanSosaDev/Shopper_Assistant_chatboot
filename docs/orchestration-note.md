# Orchestration Note — Hermes

> **Propósito:** Puente conceptual desde **Estación 6 (Implementando)** hacia **Estación 7 (Orquestación)**. Documenta cómo se ejecutaría una tarea sobre Hermes con coordinación de alcance, contexto, dependencias y evidencia.
>
> **Estado:** v0 — todavía sin orquestador en producción. Hoy el "orquestador" es **AI-DLC workflow + memoria del usuario + Claude Code en una laptop**. Esta nota documenta qué piezas tendrían que evolucionar para llegar a un orquestador real.

---

## 1. Resumen

Hermes hoy se construye con **un agente en una sesión** (Claude Code en la laptop del dev) operando sobre el AI-DLC workflow. Esto funciona para el MVP porque:

- Equipo pequeño (1 dev + agente).
- Tareas secuenciales (1 Unit a la vez).
- Sin paralelismo entre ramas o agentes.
- Audit log AI-DLC cubre la trazabilidad básica.

**La orquestación se vuelve necesaria** cuando aparece coordinación entre múltiples agentes, múltiples ramas, múltiples sistemas de validación, o múltiples handoffs entre humanos y máquinas. Para Hermes, eso ocurrirá probablemente en:

- **Code Generation** (cuando arranque): es trabajo intensivo, paralelizable por Unit, con dependencias entre ellas.
- **Operación post-MVP**: monitoreo + alertas + respuesta a incidentes + rollouts en paralelo a las 4 marcas.
- **Fase 2**: handoffs estructurados entre Marketing (Brand Managers) + IT + Compliance + Devs.

---

## 2. Las 6 preguntas del runbook §6 — respuestas para Hermes

Las respuestas concretas según el estado actual + visión de Estación 7.

### 2.1 ¿Qué arnés usarías para ejecutar una tarea?

**Hoy (build-time MVP):**
- Claude Code en la laptop del dev. Documentado en [harness-card.md](harness-card.md).
- Modelo build-time: Opus 4.7 primario, Sonnet 4.6 secundario.

**Estación 7 / Fase 2 candidates:**
- Para tareas cortas con sign-off humano (modificar prompts, ajustar threshold de alertas): **Claude Code** sigue siendo lo correcto.
- Para tareas largas autónomas (correr suite completa de tests + reportar + abrir tickets de fallos): considerar arneses cloud-based tipo **OpenHands**, **Factory** o **Codex** con tracker integrado (Linear / GitHub Issues).
- Para tareas con múltiples ramas en paralelo (rollout simultáneo a 4 marcas): orquestador encima del arnés, no más arnés.

### 2.2 ¿Qué información debe leer el agente?

Jerarquía obligatoria (cf. [AGENTS.md §4](../AGENTS.md)):

1. **AGENTS.md** — reglas del repo + preferencias del usuario.
2. **Memoria del usuario** — contexto cross-sesión (`~/.claude/projects/.../memory/`).
3. **PRODUCT.md + DESIGN.md** — criterio y memoria visual.
4. **ai-dlc/aidlc-docs/aidlc-state.md** — estado actual del workflow.
5. **ai-dlc/aidlc-docs/audit.md** — últimas decisiones para no repetir investigación.
6. **Para tareas específicas:** docs relevantes en `aidlc-docs/inception/` o `aidlc-docs/construction/`.

**Anti-patrón:** cargar el repo entero a contexto sin necesidad. Usar **Glob/Grep/Read** o **Agent subagent (Explore)** para descubrir lo necesario.

### 2.3 ¿Qué permisos tendría?

**Capa 1 — Lectura (siempre):**
- Read, Glob, Grep, WebFetch a sitios documentados (patprimo.com, docs públicos).

**Capa 2 — Escritura sobre el repo (default, sin destructive):**
- Edit / Write sobre archivos en `Shopper_Assistant_chatboot/`.
- Crear nuevos archivos.

**Capa 3 — Operaciones sensibles (con confirmación):**
- Bash con efectos persistentes (npm install, docker compose up).
- Git stage + commit (cuando el usuario lo pida explícitamente).
- WebFetch a sitios no documentados.
- Spawn de subagents para investigación profunda.

**Capa 4 — Bloqueado por preferencia del usuario:**
- `git push`, `git rebase`, `git reset --hard`, `git checkout --` destructivo.
- Force-push, `--no-verify`, `--no-gpg-sign`.
- Crear feature branches.
- Modificar git config.

**Capa 5 — Futura (Estación 7+):**
- Crear / mover tickets en tracker (Linear / GitHub Issues).
- Comentar en PRs.
- Trigger de pipelines de CI/CD.
- Notificar canales Slack / Teams / Email.

### 2.4 ¿Qué validación bloquearía entrega?

Inventario completo en [validations.md](validations.md). Para una tarea típica:

- **Si toca AI-DLC docs:** gate del workflow AI-DLC (revisión humana + audit log + actualización aidlc-state.md). Bloqueante.
- **Si toca PRODUCT.md / DESIGN.md / AGENTS.md:** revisión humana del usuario. Considerar `npx @google/design.md lint DESIGN.md` para DESIGN.md.
- **Si toca código (Code Generation futuro):**
  - `npm run lint` cero errores.
  - `npm run typecheck` cero errores.
  - `npm test` 100% pass rate + coverage ≥70%.
  - `npm run test:integration` 100% pass rate.
  - `npm audit` cero high+ vulnerabilities.
- **Si toca brand voice (system prompt, ejemplos few-shot):** sign-off del Brand Manager respectivo (P4).
- **Si toca compliance (consent gate, retención, PII):** sign-off de Compliance (P5).
- **Si toca infraestructura (Docker Compose, env vars, secrets):** revisión IT + smoke test.

### 2.5 ¿Qué evidencia debe devolver?

Para cualquier tarea ejecutada, esperar al menos:

- **Archivos modificados / creados:** lista clara con path absoluto o relativo al repo root.
- **Decisiones de diseño o producto:** justificación corta de cualquier choice no obvio.
- **Comandos ejecutados:** con output relevante si bloqueante.
- **Validaciones corridas:** qué corrió, qué pasó, qué falló.
- **Riesgos identificados:** sin auto-resolverlos.
- **TODOs descubiertos:** explícitos, no escondidos en comentarios de código.
- **Entrada en `audit.md` (si AI-DLC):** timestamp + raw user input + AI response + context.

**Para Estación 7 (orquestación real):**

- Workpad comment unificado por tarea (similar al patrón del WORKFLOW.md c2 §Step 1).
- Estado del tracker (Linear / GitHub Issue) actualizado.
- Links explícitos entre tarea, PR, commits y reviews.
- Dashboard de progreso reviewer-oriented (similar al `## Dependency Blockers & PR Review Priority` del c2).

### 2.6 ¿Qué parte estudiarías para orquestación posterior?

Prioridades para profundizar antes de Estación 7:

1. **Tracker de tareas externo** — decidir si Hermes usa Linear, GitHub Issues, Markdown local o nada. Sin tracker, "orquestación" se queda en sesiones manuales.
2. **Patrón del workpad único** — el WORKFLOW.md c2 lo resuelve elegante: 1 comment `## Agent Harness Workpad` por ticket, append-only, con Plan + Acceptance Criteria + Validation + Notes. Hermes puede heredar esto.
3. **PR feedback sweep protocol** — útil cuando equipo crezca y haya múltiples reviewers. Hoy no aplica (no PRs).
4. **Dashboard de prioridades** — el c2 mantiene tabla P0-P3 en la project description. Para Hermes, podría vivir en `docs/dashboard.md` o como pinned issue.
5. **Hooks de Claude Code** — automatizaciones triggered por eventos (post-edit, pre-commit, etc.). Útiles para orquestar workflows livianos sin necesidad de orquestador externo.
6. **Skills compuestas** — el Code Generation MVP probablemente se beneficia de un skill que orqueste los 19 steps del plan U1 (cf. `unit1-core-agente-code-generation-plan.md`).
7. **Spawn de subagents paralelos** — útil para escenarios como "valida los 3 Units en paralelo" o "scan 4 marcas observando sitios".

---

## 3. Señales que indican subir de abstracción a orquestación

Per runbook §5 Estación 6, la coordinación crece con el sistema. Para Hermes, estas señales activarían el salto a orquestación formal:

| Señal | Estado en Hermes hoy | Implicación |
|---|---|---|
| Muchas tareas dependientes | Sí (3 Units secuenciales) | Bajo MVP es manejable; en Fase 2 con 4 marcas paralelas, no. |
| Varios agentes o ramas | No | Una sesión a la vez. |
| Validación como bloqueo | Sí (gates AI-DLC) | Gates son manuales hoy; automatización futura. |
| Handoffs frecuentes | Sí (Inception → Construction × 3 Units → Build & Test) | Manejable porque están documentados en audit.md. |
| Evidencia dispersa | No (audit.md centraliza) | OK MVP; en Fase 2 con tickets + PRs + alerts, sí dispersa. |
| Repetición suficiente para automatizar | Sí (cada Unit FD/NFR-R/NFR-D/ID sigue el mismo patrón) | Justifica skill compuesto AI-DLC. |

**Conclusión:** Hermes está **en el borde** de necesitar orquestación. Para Demo Day MVP, el modelo actual aguanta. Post-Demo Day (Fase 2), la orquestación se vuelve necesaria.

---

## 4. Mapeo: WORKFLOW.md c2 → aplicabilidad a Hermes

El [WORKFLOW.md del repo c2 de Hardcore AI](https://github.com/hardcore-ai/c2/blob/main/WORKFLOW.md) define un orquestador completo basado en OpenSymphony + Linear. Evaluación de cada pieza para Hermes:

| Pieza WORKFLOW.md c2 | Aplica a Hermes | Justificación |
|---|---|---|
| **Tracker Linear** | Tal vez | Hoy no usamos Linear. GitHub Issues sería más natural por proximidad al repo. Decisión Estación 7. |
| **Estados estandarizados** (Todo, In Progress, Human Review, Merging, Rework, Done) | Sí | Modelo limpio para Code Generation MVP+. Adaptable a GitHub Projects. |
| **Workpad único** (`## Agent Harness Workpad`) | Sí (alto valor) | El audit.md ya cumple parte de esto; el workpad por ticket añadiría granularidad. |
| **Plan + Acceptance Criteria + Validation + Notes** estructura del workpad | Sí | Plantilla limpia, fácil de adoptar incluso en Markdown local. |
| **PR feedback sweep protocol** | No MVP, sí Fase 2 | Solo aplica cuando hay PRs y múltiples reviewers. Hoy trabajamos en main. |
| **Dependency Blockers & PR Review Priority dashboard** | No MVP | Útil cuando hay >5 tareas en paralelo. Hermes MVP no llega. |
| **Skills referenciadas** (linear, commit, push, pull, land) | Adaptación | "land" es valioso; "linear" depende de adoptar Linear o no. |
| **Default posture** (workpad-first, reproducción explícita, etc.) | Sí | Buenas prácticas universales. |
| **Step 0 — Determine ticket state and route** | No MVP, sí Fase 2 | Solo aplica con tracker formal. |
| **Step 2 — Execution phase con validation gates** | Sí | Concepto traducible: cada gate AI-DLC ya hace algo similar. |
| **Confusions section** del workpad | Sí | Buena práctica para evolucionar la documentación. |
| **`review-this` label trigger** | No MVP | Solo aplica con AI PR review automatizado configurado. |
| **Blocked-access escape hatch** | Sí | Patrón aplicable cualquier orquestación. |

---

## 5. Capacidades mínimas del futuro orquestador

Per Estación 6 §4 (capacidades mínimas de un arnés productivo), trasladadas a "orquestador":

| Capacidad | Para Hermes |
|---|---|
| **Tracker de tareas** | GitHub Issues recomendado (proximidad al repo, sin licencia adicional, integración con PRs cuando se necesiten) |
| **Workpad único por tarea** | Adoptar patrón c2 — un comment append-only con Plan + AC + Validation + Notes |
| **Estados estandarizados** | Adoptar c2 (Todo, In Progress, Human Review, Merging, Rework, Done) — manejable con labels en GitHub Issues |
| **Validation gates configurables** | Heredar la lógica de AI-DLC gates; aplicar a tareas no-AI-DLC también |
| **Permisos por tipo de tarea** | Persistir en AGENTS.md §5 + restringir el agente vía Claude Code settings |
| **Evidencia trazable** | audit.md + Git log + workpad + tracker = stack completo |
| **Handoff humano-máquina** | Sign-offs (Brand Manager, Compliance, IT) integrados al estado del ticket |
| **Continuidad cross-sesión** | Memoria del usuario + workpad + audit.md cubren esto sin orquestador formal |

---

## 6. Hipótesis del orquestador para Hermes

Si tuviéramos que diseñar un orquestador para Hermes hoy, esta es la propuesta tentativa (no comprometida — decisión real en Estación 7):

### 6.1 Tracker

- **GitHub Issues** con labels por estado.
- 1 issue = 1 tarea con plan ejecutable.
- Labels: `state:todo`, `state:in-progress`, `state:human-review`, `state:rework`, `state:done`.
- Labels secundarias: `area:unit1`, `area:unit2`, `area:unit3`, `area:docs`, `area:infra`, etc.
- Milestone por hito (`Demo Day MVP`, `Fase 2 — Seven Seven`).

### 6.2 Workpad

- Comment marcado `## Agent Harness Workpad` en cada issue.
- Estructura: env stamp + Plan + Acceptance Criteria + Validation + Notes (timestamped append-only) + Confusions.
- Heredado tal cual del c2.

### 6.3 PR / commits

- Trabajar en `main` (per preferencia usuario) hasta que el equipo crezca.
- Cuando se introduzcan PRs (Fase 2): convención de commit ya observada del repo (`Estacion N - <area>: <desc>`).

### 6.4 Validation gates

- Heredar gates AI-DLC para cualquier work en `aidlc-docs/`.
- Para work en `hermes/` (Code Generation futuro): activar §3 de validations.md (Vitest, Supertest, autocannon).
- Para work en docs raíz (PRODUCT/DESIGN/AGENTS): revisión humana + lint Google.

### 6.5 Arnés

- Claude Code para tareas con sign-off humano (la mayoría).
- Eventualmente Codex/OpenHands cloud-based para suites largas autónomas (build + test + report) — solo si se justifica.

### 6.6 Evidencia

- audit.md para decisiones AI-DLC.
- Git log para cambios.
- Workpad por issue.
- Memoria del usuario para contexto cross-sesión.
- Dashboard simple en `docs/dashboard.md` (si hay >5 tareas en paralelo).

---

## 7. Puente concreto a Estación 7

Lo que deja esta nota como insumo para Estación 7:

1. **Punto de partida:** Hermes hoy es un "single-agent + audit log + memoria de usuario". No es orquestación, pero tiene los building blocks.
2. **Decisiones a tomar en E7:**
   - ¿Adoptamos GitHub Issues como tracker formal?
   - ¿Heredamos el patrón workpad-único del c2?
   - ¿Activamos workflow de PR (Fase 2) o seguimos directo a main?
   - ¿Construimos un skill compuesto para orquestar Code Generation de Units?
   - ¿Conectamos MCP de GitHub / Linear para acceso desde la sesión?
3. **Insumos disponibles para E7:**
   - Este documento.
   - [validations.md](validations.md) §6 con la matriz por estado.
   - [harness-card.md](harness-card.md) con dimensiones del arnés actual.
   - WORKFLOW.md del repo c2 como referencia probada en otro contexto.
4. **No pre-comprometer:** las decisiones reales se toman en Estación 7 con el material concreto de los entregables de E6.

---

## 8. Validation State

- **Versión actual:** v0
- **Última actualización:** 2026-05-26
- **Próxima revisión obligatoria:** apertura de Estación 7 (cuando el usuario decida arrancarla).

### Items `[TBD]`

| # | Item | Bloqueante para | Dueño |
|---|---|---|---|
| 1 | Decisión sobre tracker (GitHub Issues / Linear / Markdown / nada) | Estación 7 implementation | Usuario |
| 2 | Adopción del patrón workpad-único del c2 | Estación 7 implementation | Usuario |
| 3 | Decisión sobre PRs vs main directo en Fase 2 | Crecimiento de equipo | Usuario |
| 4 | Configuración de MCP servers (GitHub / Linear / Slack) si se adopta | Estación 7 | Usuario |
| 5 | Skill compuesto para Code Generation orchestration | Reactivar Code Generation | Usuario |

---

*Orchestration Note de Hermes — v0 — Hardcore AI 30X Cohorte 2 — Estación 6*
