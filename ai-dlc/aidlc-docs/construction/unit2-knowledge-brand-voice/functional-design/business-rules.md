# Business Rules — Unit 2: Knowledge & Brand Voice

> **Scope**: reglas concretas para Unit 2. Cada regla numerada con prefijo `R-BC-*` (Brand Config) o `R-KB-*` (Knowledge Base) o `R-AUTH-*` (auth de Brand Manager).

---

## §1 — Brand Config versioning (M8)

**R-BC-1 — Cada save crea una versión.** Cada `submit(draft)` y cada `updateDraft(versionId)` resultan en cambios en la tabla `brand_config_versions`:
- `submit` → INSERT nueva fila con `status='draft'`
- `updateDraft` → UPDATE in-place de la fila draft (NO crea nueva versión por edición incremental)

**Justificación**: si cada keystroke creara versión, la tabla se llenaría de basura. El "snapshot histórico" se materializa cuando un draft pasa a `approved`.

**R-BC-2 — Solo drafts son editables.** `updateDraft(versionId)` falla con `409 Conflict` si la versión no está en estado `draft`. Para "editar" una versión approved/active, hay que crear un nuevo draft (Flow A) — esto fuerza una nueva ronda de sign-off.

**R-BC-3 — Discard de draft es irreversible.** `discardDraft(versionId)` borra la fila físicamente (DELETE). NO se puede recuperar. Solo aplica a `status='draft'`.

**R-BC-4 — Identificador inmutable.** El `versionId` (UUID) se asigna en el INSERT y nunca cambia, ni con UPDATEs ni con cambios de estado.

**R-BC-5 — Activación atómica.** El paso de una versión a `active` ejecuta TX:
```sql
BEGIN;
UPDATE brand_config_versions SET status='archived' WHERE brand=$1 AND status='active';
UPDATE brand_config_versions SET status='active', activated_at=NOW() WHERE versionId=$2;
COMMIT;
```
NO puede haber dos versiones `active` para la misma marca al mismo tiempo (constraint: índice único parcial `WHERE status='active'`).

**R-BC-6 — Rollback = re-activate.** No hay endpoint dedicado de "rollback"; el operador llama `activate(versionId)` con cualquier versión que esté en estado `approved` o `archived`. Esto promueve la versión seleccionada a `active` y mueve la anterior a `archived`.

**R-BC-7 — Veto del Brand Manager dispara alerta.** Si una versión `active` es rollback'd dentro de las primeras 48h post-activación, se genera alerta automática al equipo Hermes para post-mortem (E4-S1 AC #3).

**R-BC-8 — Solo una versión `active` per brand en runtime.** El M1 ConversationService llama `getActive(brand)` y espera **exactamente 1** resultado. Si retorna 0 → fail-closed (InternalError). Si retorna >1 → fail-closed + alerta crítica (state corrupted).

---

## §2 — Sign-off workflow (M8)

**R-SO-1 — Approver identity es obligatorio.** `approve(versionId, signOffData)` requiere:
- `approverId` (FK a `brand_manager_users`)
- `comment` (string, puede ser vacío pero NO null)
- `signedAt` (timestamp ISO, generado server-side)

**R-SO-2 — Sign-off es append-only.** Insertar en `sign_offs` table; nunca UPDATE/DELETE. Si un BM cambia de opinión, debe crear nuevo draft → nuevo sign-off (no editar el anterior).

**R-SO-3 — Solo BM scoped puede aprobar.** El `approverId` debe corresponder a un user en `brand_manager_users` cuyo `brand_scopes` array incluya la `brand` de la versión.
- Operador con rol `operator` puede aprobar **en representación** del BM si el BM dio autorización out-of-band (caso fallback) — pero esto se registra explícitamente con flag `approved_on_behalf_of=<bm_user_id>` en `sign_offs`.

**R-SO-4 — Múltiples sign-offs por versión están permitidos.** Si una versión recibe sign-off de BM original + co-sign de Marketing manager (futuro), ambos pueden constar. Solo basta UNO para que la versión pase a `approved`, pero el sistema acepta múltiples por audit trail.

**R-SO-5 — La transición a `approved` requiere ≥1 sign-off válido.** No se puede pasar a `approved` sin un INSERT exitoso en `sign_offs`. Esto se enforza vía TX combinada en `approve()`.

**R-SO-6 — El veto explícito se persiste.** Un BM puede rechazar un draft via `reject(versionId, comment)`. Esto NO mata el draft (sigue en `status='draft'` para edición), pero registra en `sign_offs` con `decision='rejected'`. El draft queda visible al autor original con feedback.

---

## §3 — Authentication & Authorization para BM UI (R-AUTH-*)

**R-AUTH-1 — Bcrypt password hashing.** Las passwords se almacenan como bcrypt hash con `saltRounds=12`. NUNCA cleartext, nunca SHA-256, nunca MD5.

**R-AUTH-2 — JWT con expiración 8h.** Tokens expiran a las 8 horas (alineado con jornada laboral). Renovación silenciosa via refresh token (Fase 2 si lo necesitamos). En MVP: el BM re-login si el token expira.

**R-AUTH-3 — JWT firmado con secret rotable.** El `JWT_SECRET` es env var ≥32 chars; rotación documentada (sin auto-rotate en MVP).

**R-AUTH-4 — Brand scope enforcement.** Cada admin endpoint que recibe `:brand` en path valida:
```ts
if (!req.user.brand_scopes.includes(params.brand) && req.user.role !== 'operator') {
  throw new ForbiddenError();
}
```

**R-AUTH-5 — Brute-force protection.** Login endpoint con rate limit (5 attempts / 15 min / IP). Después de 5 fallos consecutivos del mismo email, bloquear 30 min (alineado con SECURITY-12).

**R-AUTH-6 — Logout invalida sesión.** `POST /admin/auth/logout` agrega el token actual a una blacklist en Postgres (tabla `revoked_tokens` con TTL = exp del token). Middleware verifica blacklist en cada request.

**R-AUTH-7 — Audit log de logins.** Cada login exitoso/fallido se loguea en `auth_audit_log` con `email`, `ip`, `user_agent`, `result`, `timestamp`. Retención 90 días (SECURITY-14).

**R-AUTH-8 — Sin self-service de registro.** Los `brand_manager_users` se crean **solo** vía script administrativo del equipo Hermes Admin/Dev. No hay endpoint público de signup.

---

## §4 — UI de Brand Manager — interaction rules

**R-UI-1 — Defensive read.** El dashboard del BM hace polling cada 30s (o explicit refresh) para detectar versiones que cambiaron estado por otro actor. Evita conflicts de "yo aprobé pero alguien ya había hecho rollback".

**R-UI-2 — Confirmaciones obligatorias.** Acciones destructivas o irreversibles requieren confirmación de 2 pasos (modal):
- `approve(versionId)` → confirma con comment (puede vacío)
- `activate(versionId)` → confirma con texto "voy a activar versión X que reemplazará Y"
- `discardDraft(versionId)` → confirma con typing del nombre/id parcial

**R-UI-3 — Diff visualization.** Al revisar un draft, el UI muestra diff visual vs la versión `active` actual (text diff línea-por-línea para system_prompt; tabla diff para few_shot_examples).

**R-UI-4 — Read-only fallback.** Si el BM pierde permisos sobre su marca mid-session (ej. admin revoca scope), la UI degrada a read-only sin crashear — todos los botones de write quedan disabled con tooltip explicando.

---

## §5 — Knowledge stub (M2)

**R-KB-1 — Stub puro.** `KnowledgeService.search(query, brand, k)` retorna `[]` en Unit 2. Sin tabla pgvector, sin ingest pipeline.

**R-KB-2 — Sin telemetría de stub.** No se loguean queries al stub (Q6=A). Cuando Fase 2 implemente RAG real, ahí se agrega telemetría.

**R-KB-3 — Interface contract preservado.** La firma `IKnowledgeService.search()` se mantiene. M1 (Unit 1) lo llama como si fuera real; recibe `[]` y procede sin RAG context. Cuando Fase 2 conecte el cuerpo del search, M1 no requiere cambios.

---

## §6 — Integration con Unit 1 (IP-1)

**R-IP1-1 — Reemplazo del seed.** Cuando Unit 2 se deploya, `BrandConfigService.getActive(brand)` deja de leer el seed hardcoded de Unit 1 y empieza a leer de DB.

**R-IP1-2 — Feature flag de transición.** Variable `BRAND_CONFIG_SOURCE` (env var):
- `seed` → comportamiento de Unit 1 (fallback)
- `db` → comportamiento de Unit 2 (target)
- Default durante Unit 2 development: `seed`; flip a `db` al deploy.

**R-IP1-3 — Seeded data en DB matchea seed de Unit 1.** Al deploy Unit 2, una migration carga la versión Patprimo seed en `brand_config_versions` con `status='active'`. Esto garantiza continuidad operativa cuando el feature flag se flippea.

**R-IP1-4 — M1 NO cachea entre requests.** Para que la activación inmediata (R-BC-5) funcione, M1 hace fresh-load en cada request. Si la performance lo requiere posteriormente, se introduce cache con TTL ≤30s (Fase 2 decision).

---

## §7 — Error handling specifics

**R-ERR-BC-1 — Conflict on stale write.** Si un BM intenta `updateDraft(versionId)` y la versión cambió de estado en paralelo (otro actor la aprobó), el server responde `409 Conflict` con mensaje claro. La UI debe re-fetch y mostrar el estado actual.

**R-ERR-BC-2 — Validación de contenido.** El `system_prompt` y `few_shot_examples` se validan en cada save:
- `system_prompt`: 100-10000 chars
- `few_shot_examples`: array de 5-30 elementos; cada ejemplo tiene `user_message` (1-1000 chars) y `assistant_response` (1-2000 chars)
- `customer_facing_name`: 3-50 chars
- `tone`: ENUM `formal_close | casual | formal`

**R-ERR-BC-3 — Cascading no aplica.** Borrar un `brand_manager_user` NO borra sus sign-offs (FK con `ON DELETE SET NULL` → el sign-off conserva `approved_by=NULL` pero audit trail sobrevive).

---

## §8 — Out-of-scope (referencia)

- ❌ **Sample weekly de conversaciones** (Q5=C; pasa a Fase 2 cuando exista dashboard del Operador completo).
- ❌ **A/B testing entre versiones** (mencionado en M8 features del PRD; out of MVP Unit 2 — el A/B real es Hermes vs Oct8ne, que es Unit 3).
- ❌ **Multi-language brand configs** (Patprimo Col único; otros países Fase 2).
- ❌ **Branching de versiones** (sin merge requests entre BMs; flujo linear).
- ❌ **Auto-generated draft suggestions** (LLM no propone cambios al brand config en MVP).

---

## §9 — Security Compliance Summary

| Rule | Aplicación |
|---|---|
| SECURITY-05 | R-ERR-BC-2 input validation, Zod schemas |
| SECURITY-06 | R-SO-3 + R-AUTH-4 brand scope; rol `brand_manager` ≠ `operator` |
| SECURITY-08 | R-AUTH-1..7 auth complete |
| SECURITY-09 | R-AUTH-8 sin self-signup; sin default credentials |
| SECURITY-11 | R-BC-* workflow gobernanza prevents accidental change |
| SECURITY-12 | R-AUTH-1 bcrypt + R-AUTH-5 brute-force + R-AUTH-6 logout invalidation |
| SECURITY-13 | R-SO-2 sign_offs append-only + R-IP1-3 immutable seed migration |
| SECURITY-14 | R-AUTH-7 auth audit log 90d retention |

*No hay findings bloqueantes en este stage.*
