---
name: git-workflow
description: |
  Operaciones de versionamiento de código del proyecto Hermes: commits, push, pull, merge,
  PRs con GitHub CLI, resolución de conflictos, cleanup de branches. Sigue las convenciones
  del proyecto (siempre main, mensajes "Estación N - X" o convencional, Co-Authored-By,
  staging específico, exclusión automática de .obsidian/workspace.json).

  Trigger cuando el usuario diga: "haz commit", "commitea", "sube los cambios", "push",
  "crea un PR", "revisa conflictos", "merge", "branch nuevo", "limpia branches",
  "estado del repo", "/git", "/commit", "/push".

  No usa MCP de GitHub — solo git CLI y gh CLI ya disponibles en el sistema.
---

# Skill: git-workflow

## Filosofía del workflow en este repo

- **Trabajar siempre en `main`** ([feedback_branching](../../../memory/feedback_branching.md)).
  Excepción: experimentos de alto riesgo que el usuario solicita explícitamente. El hook
  `block-branch-create.mjs` bloquea creación de branches por seguridad — el usuario las
  crea manualmente fuera del agente.
- **Preguntar antes de commit/push importantes** ([feedback_aidlc_pacing](../../../memory/feedback_aidlc_pacing.md)).
  Decisiones materiales (cambios al state, merge a main, push de muchos commits) requieren
  confirmación explícita.
- **Nunca skip hooks** (`--no-verify`, `--no-gpg-sign`) salvo orden explícita del usuario.
- **Preferir nuevos commits sobre `--amend`** salvo orden explícita del usuario.
- **Nunca destructive sin confirmación**: `reset --hard`, `push --force`, `checkout --`,
  `clean -f`, `branch -D` requieren approval del usuario.

## Convenciones de commit

### Estilo de mensaje

El repo tiene 2 estilos coexistiendo (ambos válidos):

1. **AI-DLC / Estación**: `Estación N - <descripción breve>: <detalle>`
   - Ejemplos: `Estacion 7 - Hotfix Unit 1: 8 bugs encontrados durante smoke caso 1`
   - Use cuando el commit corresponde a trabajo del programa Hardcore AI 30X.

2. **Convencional**: `<type>(<scope>): <descripción>`
   - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`
   - Ejemplos: `feat(product-recommendations): mini-feature búsqueda productos en chat`
   - Use para cambios técnicos genéricos sin estación específica.

### Body del commit

- Lista los cambios concretos por archivo o por feature
- Si arregla bugs, numerar (1, 2, 3...)
- Para refactor / cambios grandes: explicar el "por qué", no solo el "qué"
- Para fixes: incluir cómo se verificó (smoke, manual, etc.)

### Footer obligatorio

```
Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

### Cómo escribir el mensaje en el comando

Usar HEREDOC para preservar formato multi-línea:

```bash
git commit -m "$(cat <<'EOF'
Estación N - <subject>

Body con varias líneas...

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

## Staging policy

- **Stage específico por nombre**: `git add path/to/file1 path/to/file2`
- **NUNCA** `git add .` ni `git add -A` (riesgo de incluir .env, credentials, archivos accidentales)
- **Excluir automáticamente**:
  - `.obsidian/workspace.json` (cambia constantemente con la actividad de Obsidian del user, decisión de no commitear)
  - `.env`, `.env.local` (gitignored ya, pero double-check)
  - `node_modules/`, `dist/`, build artifacts (gitignored)

## Push

### Convención

- Push directo a `main` (ver filosofía arriba)
- Verificar primero que no haya divergencia con origin:

```bash
git fetch origin
git log origin/main..HEAD --oneline   # commits locales sin push
git log HEAD..origin/main --oneline   # commits remotos sin pull
```

- Si origin/main tiene commits que main local no tiene → rebase primero:

```bash
git pull --rebase origin main
```

- Después del push, verificar:

```bash
git log origin/main -1 --format="%h %s"
```

### Nunca

- `git push --force` o `--force-with-lease` a `main` sin orden explícita del usuario
- Push de tags accidental (`git push --tags` solo si explícito)

## Pull

Default: `git pull --rebase origin main` para mantener historia lineal sin merge commits ruidosos.

Si hay conflictos durante el rebase:
1. Leer ambos lados del conflict marker
2. Proponer resolución al usuario
3. NUNCA `--theirs`/`--ours` ciego
4. Después: `git add <archivos>` + `git rebase --continue`
5. Si se complica: `git rebase --abort` y reconsiderar approach

## Branches

### Default: NO crear

El hook `.claude/hooks/block-branch-create.mjs` bloquea `git checkout -b` y `git branch <new>`
para forzar el flujo main-único.

### Cuándo SÍ crear branch

Solo en estos casos:
1. **Experimento riesgoso** que podría romper main (ej. refactor grande, feature exploratoria)
2. **El usuario lo pide explícitamente** ("vamos en una rama")
3. **Necesidad técnica específica** que el usuario aprueba

### Cómo crear branch cuando aplica

Como el hook bloquea al agente, el usuario debe ejecutar manualmente:

```powershell
# En terminal aparte (no Claude Code)
cd C:\Users\sosab\source\repos\Shopper_Assistant_chatboot
git checkout -b feature/<nombre-descriptivo>
```

Después el usuario avisa "lista" y el agente continúa desde esa branch.

Nombres sugeridos: `feature/<nombre>`, `fix/<bug>`, `experiment/<idea>`.

### Cuándo borrar branch

Cuando una feature branch ya mergeó a main:

```bash
git branch -d feature/<nombre>    # safe delete (solo si está mergeada)
```

Para forzar borrado: `git branch -D <name>` — pero pedir confirmación.

## Merge

### Default: fast-forward

Cuando una feature branch va adelante de main por commits que main no tiene:

```bash
git checkout main
git merge feature/<nombre>    # fast-forward automático si posible
```

Resultado deseado: historia lineal, sin merge commit.

### Cuando NO se puede ff

Si main avanzó mientras feature trabajaba:
1. `git checkout feature/<nombre>`
2. `git rebase main` (replays feature commits encima de main actual)
3. Resuelve conflictos si surgen
4. `git checkout main && git merge feature/<nombre>` (ahora SÍ es ff)

### Squash merge (raro, casos específicos)

Si la feature branch tiene muchos commits ruidosos (WIPs, fix typo, etc.) y quieres
condensar a 1 solo commit limpio en main:

```bash
git checkout main
git merge --squash feature/<nombre>
git commit -m "feat: <descripción consolidada>"
```

Confirmar con usuario antes — pierde el historial detallado.

## Pull Requests

### Cuándo crear PR

Este proyecto NO usa PR-workflow normal — commits van directo a main. Pero algunos casos
SÍ ameritan PR:

1. Cambio que el usuario quiere revisar formalmente antes de mergear
2. Documentación / entrega a stakeholders (la PR queda como artifact en GitHub)
3. Si el proyecto migra a equipo y requiere code review

### Cómo crear con `gh`

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
- <bullet>
- <bullet>

## Test plan
- [ ] <step>
- [ ] <step>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Operaciones útiles de `gh`

```bash
gh pr list                              # listar PRs abiertos
gh pr view <num>                        # ver PR específico
gh pr checks <num>                      # estado de CI
gh pr comment <num> --body "<texto>"    # comentar
gh pr merge <num> --squash              # merge desde CLI
gh issue list                           # issues abiertos
gh issue create --title "<t>" --body "<b>"
gh run list                             # GitHub Actions runs
gh run view <id> --log-failed           # logs de un run fallido
```

## Resolución de conflictos

### Detección

`git status --short` muestra archivos en conflicto con `UU`, `AA`, `DD`, etc.

### Workflow recomendado

1. Leer cada archivo conflictivo con `Read` tool
2. Identificar los markers `<<<<<<<`, `=======`, `>>>>>>>`
3. Proponer al usuario la resolución (qué lado tomar, o un merge manual)
4. Una vez aprobada, editar el archivo eliminando markers y dejando el resultado correcto
5. `git add <archivo>` para marcar resuelto
6. Si era merge: `git commit` (mensaje auto-generado o custom)
7. Si era rebase: `git rebase --continue`

### NUNCA

- `git checkout --theirs <archivo>` o `--ours` sin entender qué se descarta
- Editar conflicts sin confirmar con el usuario qué lado priorizar
- Hacer commit con markers de conflicto aún presentes

## Cleanup útil

```bash
git branch --merged main | grep -v main | xargs -n 1 git branch -d   # borrar mergeadas
git remote prune origin                                              # remove stale refs
git gc --prune=now                                                    # garbage collection
git log --oneline --graph --all -20                                   # visualizar historia
git stash list                                                        # ver stashes guardados
```

## Diagnóstico rápido

```bash
git status --short                              # ver cambios
git log --oneline -10                           # últimos commits
git log origin/main..HEAD --oneline             # locales sin push
git log HEAD..origin/main --oneline             # remotos sin pull
git diff origin/main --stat                     # qué cambió vs origin
git log -p <archivo>                            # historia de un archivo
git blame <archivo>                             # quién cambió qué línea
git reflog                                       # historia de movimientos de HEAD (recovery)
```

## Anti-patterns conocidos

| ❌ | ✅ |
|---|---|
| `git add .` | `git add path/specific1 path/specific2` |
| `git commit --amend` (modifica historia) | Nuevo commit |
| `git push --force` | `git push --force-with-lease` solo si necesario + confirmar |
| `git rebase main` en branch shared | Coordinar con equipo |
| `git pull` (con merge default) | `git pull --rebase` |
| `git checkout -- <file>` (destructivo) | `git restore <file>` con confirmación |
| `git reset --hard` sin backup | Crear branch backup primero |

## Cuándo NO actuar

El agente NO debe hacer ninguna de estas sin orden explícita del usuario:

- Push a main (siempre confirmar)
- Force push de cualquier tipo
- Delete branch (incluso si está mergeada)
- Crear PR (decisión del usuario)
- Skip hooks (`--no-verify`)
- Stash drop / pop sin verificar contenido
- Cualquier operación destructiva no reversible

## Referencias

- Memoria del repo: [feedback_branching](../../../memory/feedback_branching.md)
- Memoria pacing: [feedback_aidlc_pacing](../../../memory/feedback_aidlc_pacing.md)
- Snapshot proyecto: [project_status_snapshot](../../../memory/project_status_snapshot.md)
- AGENTS.md raíz del repo (convenciones generales)
