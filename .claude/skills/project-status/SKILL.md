---
name: project-status
description: |
  Genera un estado detallado del proyecto Hermes en 2 partes: (A) snapshot interno del proyecto
  basado en memoria + git + aidlc-state.md, y (B) cruce con las estaciones del programa
  Hardcore AI 30X cohorte 2 (carpeta `~/source/repos/30x-ai-docs/_repo_30x/c2/`).

  Trigger cuando el usuario diga: "status del proyecto", "dame el estado", "qué tenemos",
  "estatus", "/project-status", o pregunte sobre el avance del proyecto, las estaciones del
  programa, o qué falta para Demo Day.

  El skill pregunta explícitamente desde qué estación cruzar (1-12), con default a la última
  estación en progreso identificada del estado actual.
---

# Skill: project-status

## Propósito

Re-generar el estado completo del proyecto Hermes en cualquier sesión nueva, sin re-explicar
el contexto desde cero. Reemplaza la necesidad de scrollear el historial de conversaciones
anteriores.

## Cuándo se activa

- Invocación explícita: el usuario escribe `/project-status` o dice frases como:
  - "dame status del proyecto"
  - "qué tenemos"
  - "estatus completo"
  - "cómo vamos con el demo"
  - "cruce con las estaciones"
  - "qué falta"
- Invocación implícita: el usuario inicia una sesión nueva y pregunta sobre el estado del
  proyecto o el avance.

## Pasos a ejecutar

### Paso 1 — Recopilar contexto interno (en paralelo donde sea posible)

1. Leer las memorias relevantes:
   - `~/.claude/projects/C--Users-sosab-source-repos-Shopper-Assistant-chatboot/memory/project_status_snapshot.md` ← snapshot canónico
   - `~/.claude/projects/.../memory/MEMORY.md` ← índice de memorias
   - Otras `project_*` y `feedback_*` mencionadas en MEMORY.md
2. Leer `ai-dlc/aidlc-docs/aidlc-state.md`
3. Ejecutar `git log --oneline -10` y `git status --short`
4. Verificar diff con `origin/main`: `git log origin/main..HEAD --oneline`
5. Identificar si hay cambios sin commit, branches activas, o commits sin push

### Paso 2 — Preguntar al usuario desde qué estación cruzar

Identificar la última estación en progreso a partir de `project_status_snapshot.md` (tabla
de estaciones). Esa será la opción default.

Usar `AskUserQuestion` con:

- Pregunta: "¿Desde qué estación cruzo con el programa Hardcore AI 30X? (1-12)"
- Header corto: "Cruce desde"
- Opciones:
  - "Desde estación N (Recomendado)" — donde N es la última en progreso identificada
  - "Desde estación 1 (todo el programa)"
  - "Solo las pendientes (skip las ✅)"

### Paso 3 — Leer estaciones del programa

Carpeta base: `C:\Users\sosab\source\repos\30x-ai-docs\_repo_30x\c2\`

Estructura típica:
- `Estación 1/`, `Estación 2/`, ..., `Estación 7/`, `Estación 8/`, `Estación 9/`, `Estación-10/`
- Cada una tiene: `README.md` o `clase-N-estudiante.md` o `brief.md` con entregables esperados

Para cada estación >= N elegida, leer el archivo principal (README/clase/brief) y extraer:
- Nombre y objetivo
- Entregables esperados (lista)
- Estado actual en Hermes (cross-reference con snapshot)
- Riesgo si falta
- Esfuerzo estimado

### Paso 4 — Entregar 2 tablas al usuario

**Tabla A — Estado interno del proyecto:**

| Item | Estado |
|---|---|
| Lifecycle phase | ... |
| Stack | ... |
| Commits desde origin/main | ... |
| Branch actual | ... |
| Cambios sin commit | ... |
| Smoke suite | ... |
| Stack Docker / Tunnel | ... |
| Próximos pasos críticos | ... |

**Tabla B — Cruce con estaciones del programa (desde N en adelante):**

| # | Estación | Entregable esperado | Estado Hermes | Riesgo | Prioridad |
|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... |

### Paso 5 — Cerrar con próximas acciones sugeridas

Lista corta y accionable basada en:
- Día actual vs Demo Day (2026-06-09)
- Estaciones pendientes con prioridad alta
- Bugs conocidos o blockers actuales

## Cuándo NO ejecutar este skill

- Si el usuario ya tiene el estado fresco en la conversación actual (ej. lo pidió hace 3 turnos)
- Si está en mitad de una implementación concreta (no interrumpir flow)

## Cuándo sugerir actualizar el snapshot

Si al ejecutar el skill detectas que `project_status_snapshot.md` está desactualizado:
- Hay >3 commits desde el último update
- Hay nuevas memorias `project_*` no referenciadas
- El `aidlc-state.md` tiene info materialmente distinta al snapshot

Entonces sugiere al final: "Tu snapshot está desactualizado en X cosas. ¿Quieres que lo actualice ahora?"
Pero solo actualízalo si el usuario confirma — el feedback explícito dice manual.
