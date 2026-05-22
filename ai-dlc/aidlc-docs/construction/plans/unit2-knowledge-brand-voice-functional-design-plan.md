# Functional Design Plan — Unit 2: Knowledge & Brand Voice

## Plan Overview

**Unit**: Unit 2 — Knowledge & Brand Voice
**Modules in scope**: M2 Knowledge Base (stub mínimo) + M8 Brand Configuration (CRUD, sign-off, versioning, activate/rollback)
**Stories in scope (1 gruesa)**: **E4-S1** — Voz Patprimo + sign-off Brand Manager
**MUST HAVE features cubiertas**: MH-3 (per-brand voice de Patprimo) end-to-end
**Purpose**: Definir el detalle de business logic, reglas y entidades para Unit 2. Technology-agnostic.

**Filosofía MVP**: Unit 2 es 1 story gruesa con bastante lógica de gobernanza (sign-off, versioning, rollback). Sin código todavía — solo design.

**Input artifacts:**
- `aidlc-docs/inception/application-design/unit-of-work.md` (Unit 2 definition)
- `aidlc-docs/inception/application-design/components.md` (M2 + M8 interfaces)
- `aidlc-docs/inception/application-design/component-methods.md` (IBrandConfigService signatures)
- `aidlc-docs/inception/user-stories/stories.md` (AC Gherkin de E4-S1)
- `aidlc-docs/construction/unit1-core-agente/functional-design/` (cómo M1 consume el brand config — IP-1 reemplazo del seed)

**Reminder de scope (de stories.md E4-S1):**
- 4 scenarios Gherkin: system prompt v1 validado por BM, muestra semanal post-launch, veto mid-launch → rollback, versionado de configuraciones.

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Workflow de sign-off (cómo Brand Manager aprueba)

¿Cómo materializamos el sign-off del Brand Manager?

A) **UI dedicada in-app** — Brand Manager tiene login + dashboard con drafts pendientes, botones Aprobar/Rechazar/Comentario, audit trail visual. Más complejo, más complete.
B) **API admin-only** — endpoint `POST /admin/brands/:brand/configs/:versionId/sign-off` con auth (JWT/basic) que el Operador invoca **representando** la decisión del Brand Manager (decisión out-of-band: reunión, email, slack). DB persiste `approved_by + approved_at + comment`. Mucho más simple, defendible auditablemente.
C) **Out-of-band manual** — Brand Manager firma email/papel; el Operador hace `UPDATE` directo en DB con script administrativo. Menos auditable.
X) Otro

[Answer]: A

---

### Question 2 — Granularidad del versionado

¿Cuándo se crea una nueva versión del brand config?

A) **Cada save (PUT/POST)** crea nueva fila en `brand_config_versions` — drafts y aprobados conviven en la misma tabla con flag `status` (`draft`/`approved`/`active`/`archived`). Append-only natural.
B) **Solo en activación** — los drafts viven en memoria/tabla separada; al activar se promueve a la tabla histórica de versiones.
C) **Versioning explícito on-demand** — el operador hace "snapshot" cuando quiere; ediciones intermedias no crean versión.
X) Otro

[Answer]: A

---

### Question 3 — Semantics de activación

Al aprobar y "activar" una versión, ¿cómo entra en producción?

A) **Activación inmediata** — `UPDATE brand_config_versions SET status='active' WHERE versionId=X` + el M1 ConversationService la lee en la siguiente request (memoria fresh-load). Sin staging intermedio. Simple.
B) **Blue-green con dos slots** — versión "live" + versión "staged"; un comando flip cambia roles. Más resiliente, más complejo.
C) **Activación programada** — versión con `effective_from` timestamp; se vuelve activa cuando llega ese momento. Útil para coordinar con marketing (ej. cambio de voz para una campaña).
X) Otro

[Answer]: A

---

### Question 4 — Semantics de rollback

¿Cómo se hace rollback si una versión falla post-activación?

A) **Pick-from-list** — operador ve historial, selecciona versión X aprobada anterior, `activate(versionId=X)`. Mayor flexibilidad operativa.
B) **Stack-based pop** — rollback automático a la versión inmediatamente anterior (la N-1). Más rápido pero menos flexible (no se puede saltar a N-3 directo).
C) **Ambas** — endpoint genérico `rollback()` (= pop) + endpoint `activate(versionId)` (= pick). Cliente operacional decide.
X) Otro

[Answer]: A

---

### Question 5 — Muestra semanal de conversaciones para Brand Manager

E4-S1 AC #2 menciona "Muestra semanal post-launch". ¿Cómo se implementa?

A) **Sample automático weekly** — job que cada lunes saca N=20-50 conversaciones representativas (random + stratified por intent), las pone en una vista para Brand Manager.
B) **Manual on-demand** — Brand Manager (o Operador asistiendo) pide muestra con filtros, sin job automático.
C) **Out of scope MVP** — sign-off del prompt v1 sí es scope; la muestra periódica queda como "Fase 2" porque requiere infra de dashboard que aún no existe (E2-S1 es Unit 3).
D) **Hybrid** — sample automático weekly archivado, pero acceso visual solo vía dashboard del Operador (Unit 3); en Unit 2 solo el job + storage.
X) Otro

[Answer]: C

---

### Question 6 — Stub M2 Knowledge (depth)

M2 Knowledge no se implementa funcionalmente en MVP — pero ¿qué nivel de stub?

A) **Pure stub** — `KnowledgeService.search()` retorna `[]` siempre; sin tabla pgvector, sin nada. Mínimo absoluto.
B) **Stub + schema preparado** — tabla `knowledge_embeddings` (pgvector) creada vacía + service retorna []; Unit 2 deja la infra lista para Fase 2 sin implementar ingest pipeline.
C) **Stub + telemetría** — service retorna [] pero loguea cada query con `intent`, para medir potencial usage de RAG en Fase 2 planning.
X) Otro

[Answer]: A

---

> Cuando termines de responder, escribe **"listo"** y procedo a (a) validar respuestas, (b) generar los 3 artefactos de Functional Design para Unit 2 (`business-logic-model.md`, `business-rules.md`, `domain-entities.md`). Sin frontend en este unit — el Brand Manager interface se sirve via API admin endpoints (Q1=B típicamente).

---

## Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1=A, Q2=A, Q3=A, Q4=A, Q5=C, Q6=A — sin ambigüedades; Q1=A introduce frontend scope explicitado al user
- [x] Generar `business-logic-model.md` — workflow CRUD + sign-off + activate/rollback + state machine BrandConfigVersion + 6 sequence diagrams (create, edit, sign-off, activate, rollback, IP-1 M1 integration) + auth flow
- [x] Generar `business-rules.md` — 9 secciones (R-BC-* versioning, R-SO-* sign-off, R-AUTH-* auth, R-UI-* UI rules, R-KB-* stub, R-IP1-* integration, R-ERR-BC-* errors, out-of-scope, security)
- [x] Generar `domain-entities.md` — 5 entidades nuevas (BrandConfigVersion, SignOff, BrandManagerUser, RevokedToken, AuthAuditLog) + ERD Mermaid + index strategy + Patprimo seed migration
- [x] Generar `frontend-components.md` — 5 pages, components reutilizables, validation rules, auth flow, performance budget
- [x] Verificar consistencia con AC Gherkin de E4-S1
- [x] Security compliance summary — SECURITY-05, 06, 08, 09, 11, 12, 13, 14 aplicados
- [x] Actualizar `aidlc-state.md`
- [ ] Presentar completion message (2-option)
