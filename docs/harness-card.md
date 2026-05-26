# Harness Card — Hermes

> **Propósito:** Ficha del arnés y modelo(s) usados para **construir** Hermes. Documenta la superficie de trabajo, sus capacidades, permisos, validación y evidencia. Entregable de **Estación 6 (Implementando)** del programa Hardcore AI 30X Cohorte 2.
>
> **No confundir con el modelo del producto:** este archivo documenta el **arnés de construcción** (Claude Code en la laptop del dev). El modelo de **runtime** del chatbot Hermes (Claude Haiku 4.5 vía AWS Bedrock) está documentado en [AGENTS.md §2](../AGENTS.md) y [ai-dlc/aidlc-docs/construction/unit1-core-agente/](../ai-dlc/aidlc-docs/construction/unit1-core-agente/).

---

## 1. Resumen

| Dimensión | Valor |
|---|---|
| **Arnés primario** | Claude Code (CLI + IDE extension) |
| **Modelo primario (build-time)** | Claude Opus 4.7 (`claude-opus-4-7`) |
| **Modelo secundario (build-time)** | Claude Sonnet 4.6 (`claude-sonnet-4-6`) — cuando Opus está rate-limited o para tareas más livianas |
| **Modelo de runtime (producto)** | Claude Haiku 4.5 vía AWS Bedrock — ver [AGENTS.md §2](../AGENTS.md) |
| **OS dev** | Windows 11 |
| **Shell** | PowerShell + Bash disponible |
| **Repo local** | `C:/Users/sosab/source/repos/Shopper_Assistant_chatboot/` |
| **Estado** | v0 — 2026-05-26 |

---

## 2. Las 7 dimensiones del arnés

Estructura derivada del runbook de [Estación 6 §3](https://github.com/anthropic/hardcore-ai-30x) (programa Hardcore AI 30X Cohorte 2).

### 2.1 Superficie

| Atributo | Detalle |
|---|---|
| **Tipo** | CLI + IDE extension (VS Code / Cursor compatible) |
| **Modo de uso** | Sesiones interactivas conversacionales con tool use |
| **Working directory** | Configurado por sesión (Hermes = `Shopper_Assistant_chatboot/`) |
| **Persistencia** | Memoria del usuario en `~/.claude/projects/<repo-slug>/memory/` (cross-sesión) |
| **Estado fuera de sesión** | Workspace persistido a disco (git, archivos); contexto de conversación se compacta automáticamente |

### 2.2 Modelo

| Atributo | Detalle |
|---|---|
| **Modelo primario** | Claude Opus 4.7 (`claude-opus-4-7`) |
| **Conocimiento cutoff** | Enero 2026 |
| **Familia más reciente conocida** | Claude 4.X (Opus 4.7, Sonnet 4.6, Haiku 4.5) |
| **Fast mode disponible** | Sí, vía `/fast` (acelera output sin downgrade del modelo) |
| **Elección de modelo** | Permitida vía configuración Claude Code (`/model`) |
| **Multimodalidad** | Lectura de imágenes (PNG, JPG, screenshots), PDFs, Jupyter notebooks |

### 2.3 Contexto

| Atributo | Detalle |
|---|---|
| **Ventana de contexto** | Larga — soporta el repo Hermes entero + memoria del usuario sin compactación frecuente |
| **Compactación automática** | Sí — mensajes previos se resumen al acercarse al límite de contexto. Continuidad preservada. |
| **Memoria persistente cross-sesión** | Sí — sistema de memoria del usuario en `~/.claude/projects/...` con `MEMORY.md` index + archivos individuales |
| **Archivos de contexto leídos** | AGENTS.md + CLAUDE.md (en subdirectorio) + PRODUCT.md + DESIGN.md + memoria del usuario (auto-cargada) |
| **Imports** | Vía menciones `@archivo` y referencias relativas Markdown |
| **Riesgos identificados** | Saturación si se cargan archivos enormes sin necesidad; mitigado por uso explícito de Read tool y Agent subagent |

### 2.4 Ejecución

| Capacidad | Disponible | Notas |
|---|---|---|
| **Leer archivos** | ✅ | Read tool, soporta archivos grandes con offset/limit |
| **Editar archivos** | ✅ | Edit tool (diff exacto) y Write tool (creación/sobrescritura) |
| **Listar y buscar** | ✅ | Glob (patrón), Grep (ripgrep) |
| **Ejecutar comandos shell** | ✅ | Bash tool (con sandbox) + PowerShell tool |
| **Background processes** | ✅ | `run_in_background` para tareas largas |
| **Web access** | ✅ | WebFetch (lectura) + WebSearch (búsqueda) |
| **Spawn subagents** | ✅ | Agent tool con tipos especializados (Explore, Plan, general-purpose) |
| **Git operations** | ✅ | Vía Bash, con guardrails de seguridad (no force-push, no reset --hard sin permiso) |
| **Crear ramas / PRs** | ✅ | Disponible, pero **deshabilitado por preferencia del usuario** (trabajar en `main`) |
| **Editar notebooks Jupyter** | ✅ | NotebookEdit |
| **MCP servers** | Disponible | Ninguno custom configurado para Hermes hoy |
| **Tareas (TaskCreate/Update)** | ✅ | Sistema de tracking de tareas dentro de la sesión |
| **Spawn de sesiones paralelas** | Disponible | Vía `mcp__ccd_session__spawn_task` para work out-of-scope |

### 2.5 Permisos

| Tipo | Estado |
|---|---|
| **Modo de permisos** | Plan-mode / acceptEdits — el usuario aprueba acciones sensibles |
| **Aprobación automática** | Solo lecturas (Read, Glob, Grep) y operaciones safe documentadas |
| **Aprobación explícita requerida** | Edit/Write fuera del repo, Bash con efectos persistentes (git, npm, instalar deps), WebFetch a sitios nuevos, spawn de subagents |
| **Operaciones destructivas BLOQUEADAS por preferencia del usuario** | force-push, reset --hard, rm -rf en zonas críticas, git config, hooks skip (`--no-verify`) |
| **Settings location** | `.claude/settings.json` (proyecto) + `~/.claude/settings.json` (user). No hay settings de proyecto custom hoy. |
| **Hooks configurados** | No (default Claude Code) |

### 2.6 Validación

| Capacidad | Estado | Notas |
|---|---|---|
| **Lint Markdown** | No instalado | Posible Fase 2 (markdownlint) |
| **Lint Mermaid** | Manual | Recomendado por AI-DLC `common/content-validation.md` |
| **Lint Google DESIGN.md** | Disponible | `npx @google/design.md lint DESIGN.md` — pendiente correr |
| **Tests Vitest / fast-check** | ❌ NO disponible | Documentado en `build-and-test/` pero **no ejecutable** porque `hermes/` no existe aún |
| **Tests Integration / autocannon** | ❌ NO disponible | Mismo motivo |
| **Type check (`tsc`)** | ❌ NO disponible | Mismo motivo |
| **Build (`npm run build`)** | ❌ NO disponible | Mismo motivo |
| **Revisión humana de docs** | ✅ | Mecanismo principal hoy — gates AI-DLC con aprobación explícita |
| **Audit log AI-DLC** | ✅ | `ai-dlc/aidlc-docs/audit.md` registra todas las decisiones con timestamp |
| **Code review** | Disponible | Skill `code-review` y `security-review` (Claude Code) cuando exista código |
| **PR review automatizado** | No instalado | Fase 2 candidate (OD-8) |

**Resumen del estado de validación HOY:**

> El único mecanismo de validación operativo es **revisión humana + audit log AI-DLC**. Toda validación automática queda activada cuando se ejecute Code Generation.

### 2.7 Evidencia

| Tipo | Mecanismo |
|---|---|
| **Decisiones del workflow AI-DLC** | `ai-dlc/aidlc-docs/audit.md` (append-only, ISO timestamps, raw user input preservado) |
| **Estado del workflow** | `ai-dlc/aidlc-docs/aidlc-state.md` (source-of-truth de progreso) |
| **Cambios en código / docs** | Git log + commits con prefijo de Estación + co-authorship del agente |
| **Memoria de decisiones cross-sesión** | Memoria del usuario en `~/.claude/projects/.../memory/` con index `MEMORY.md` |
| **Plans aprobados** | Plan files en `ai-dlc/aidlc-docs/{inception,construction}/plans/` con checklist `[x]` por step |
| **Sign-off de stakeholders** | Texto literal en audit.md (`"Approve & Continue"`, `"Continue to Next Stage"`, etc.) |
| **Blockers resueltos** | `ai-dlc/aidlc-docs/blockers/` con header `✅ RESUELTO` + cita textual del usuario |
| **Estación 6 deliverables** | `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `docs/harness-card.md`, `docs/validations.md`, `docs/orchestration-note.md` (este archivo + los demás del Paso E6) |

---

## 3. Inferencia (costo, latencia, evals)

Características relevantes del modelo build-time para tomar decisiones operativas. Referenciar a [docs/30x-ai-docs/14 Costos Latencia y Evals.md](https://github.com/sosab/30x-ai-docs) para fundamentos.

### 3.1 Costo

- **Modelo build-time (Opus 4.7):** sin datos de pricing público dentro del cutoff del modelo; se asume top-tier ($/M tokens más alto que Sonnet o Haiku).
- **Modelo runtime (Haiku 4.5):** USD ~$1/M input, ~$5/M output (referencia ISB §7).
- **Implicación operativa:** sesiones largas con Opus consumen más tokens; pero la **densidad de trabajo por sesión** (decisiones de arquitectura, scope, voz de marca) justifica el costo en build-time. Para tareas mecánicas (formateo, listings, búsquedas), usar Sonnet o Haiku.
- **Cache de prompts:** Opus 4.7 soporta caching para reducir costo cuando se relee material grande dentro de la misma sesión.

### 3.2 Latencia

- **Modelo build-time (Opus 4.7):** latencia más alta que Sonnet/Haiku — aceptable porque las sesiones son conversacionales, no transaccionales.
- **Modelo runtime (Haiku 4.5):** target chat <30 seg p50 / <60 seg p95 (PRODUCT.md §4).
- **Fast mode `/fast`:** acelera el output del modelo sin cambiarlo. Útil para sesiones largas o iteración rápida.

### 3.3 Evals

- **Eval del modelo build-time:** no se mide formalmente en este proyecto. La calidad del trabajo del agente se valida vía gates AI-DLC (revisión humana del usuario en cada stage).
- **Eval del modelo runtime:** documentada en Unit 1 NFR-D + Build & Test docs. Eval offline manual del LLM response (Bedrock Haiku 4.5) es Fase 2; el MVP usa sign-off del Brand Manager + monitoreo de KPIs (PRODUCT.md §4).
- **Benchmarks externos para calibrar expectativas:** Terminal Bench, Artificial Analysis. No medidos directamente en Hermes; útiles como signal de tendencia general.

---

## 4. Mapa de arneses (contexto Bloque 4 Estación 6)

Dónde se ubica Claude Code respecto a otros arneses del mercado. Solo informativo — Hermes usa Claude Code.

| Arnés | Tipo | Superficie | Modelo nativo |
|---|---|---|---|
| **Claude Code** (este) | CLI + IDE | Local repo, terminal, IDE | Claude (Opus, Sonnet, Haiku) |
| **Codex** (OpenAI) | CLI + cloud | Local repo + cloud sandboxes | GPT-5+, o1, configurable |
| **OpenHands** | Open-source, cloud agent | Cloud workspace + browser | Cualquier LLM vía API |
| **Factory** | Cloud agent + dashboard | Cloud workspace, ticket-driven | Claude / GPT, configurable |
| **OpenCode** | CLI open-source | Local | Cualquier LLM vía API |
| **Antigravity 2** | IDE-first | Local IDE | Multiple LLMs |
| **Pi** | Conversational assistant | Browser, mobile | Inflection 2.5 (no code-focused) |

**Criterios para evaluar un arnés productivo (per runbook §3 Estación 6):**

1. **Tools:** lectura/escritura de archivos, ejecución de comandos, búsqueda.
2. **Contexto repo-local:** capacidad de leer el repo entero, no solo lo que el usuario pega.
3. **Permisos:** mecanismo de aprobación de acciones sensibles.
4. **Validación:** correr tests, lint, build, revisión visual.
5. **Observabilidad:** logs, evidencia de cambios.
6. **Evidencia:** reporte de qué cambió, cómo se validó, qué bloqueó.

Claude Code cumple los 6 criterios. Otros arneses cumplen subsets distintos.

---

## 5. Decisiones específicas del arnés para Hermes

### 5.1 Preferencias persistidas (cf. AGENTS.md §5)

El arnés respeta estas reglas obligatoriamente:

- Trabajar en `main`, sin feature branches.
- No commits sin pedirlo el usuario.
- No push sin pedirlo el usuario.
- AI-DLC pacing: preguntar antes de transición/decisiones/code-gen/rollback.
- Documentación en español; código y comentarios técnicos en inglés.
- Sin emojis decorativos.

### 5.2 Subagents usados en este proyecto

Cuando aplica:

| Subagent | Uso |
|---|---|
| `general-purpose` | Investigación de múltiples archivos o tareas multi-step |
| `Explore` | Búsqueda rápida read-only de código/símbolos |
| `Plan` | Diseño de plans de implementación (no se ha usado en E6 docs) |

### 5.3 Tools que NO se usan en Hermes

- **MCP servers custom:** ninguno configurado. Si en Fase 2 se conecta Linear o GitHub MCP, agregar aquí.
- **Web automation:** Claude in Chrome / Claude Preview no son necesarios para E6 (no hay UI viva todavía).
- **Notebook editing:** no aplica (no hay Jupyter en Hermes).

---

## 6. Riesgos operativos del arnés

| Riesgo | Mitigación |
|---|---|
| Saturación de contexto en sesiones muy largas | Compactación automática + uso de subagents para tareas exploratorias |
| Memoria stale (info desactualizada) | Revisar `MEMORY.md` al inicio de sesión + verificar contra estado actual antes de actuar |
| Modelo entrega información obsoleta sobre librerías / APIs | Verificar contra documentación oficial / código actual; cutoff es enero 2026 |
| Agente toma acción destructiva sin permiso | Preferencias del usuario §5.1 + guardrails de Claude Code + revisión humana en cada gate AI-DLC |
| Discrepancia entre lo que el agente cree haber hecho y lo que realmente hizo | Verificar con Read/Bash después de Edit/Write críticos (per system instructions del agente) |

---

## 7. Validation State

- **Versión actual:** v0
- **Última actualización:** 2026-05-26
- **Próxima revisión obligatoria:** cuando se cambie de arnés (Codex/OpenHands) o cuando se conecten MCP servers custom.

### Items `[TBD]`

| # | Item | Bloqueante para | Dueño |
|---|---|---|---|
| 1 | Pricing exacto Opus 4.7 vs Sonnet 4.6 vs Haiku 4.5 | Análisis formal de costo build-time | Equipo Hermes |
| 2 | Benchmark de Hermes runtime contra Terminal Bench o equivalente | Fase 2 evals | Equipo Hermes |
| 3 | Decisión sobre Linear o GitHub Issues MCP para Estación 7 | Orquestación E7 | Usuario (orchestration-note.md) |

---

*Harness Card de Hermes — v0 — Hardcore AI 30X Cohorte 2 — Estación 6*
