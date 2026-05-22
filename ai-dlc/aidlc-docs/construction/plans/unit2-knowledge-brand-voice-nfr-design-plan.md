# NFR Design Plan — Unit 2: Knowledge & Brand Voice

## Plan Overview

**Unit**: Unit 2
**Purpose**: Traducir las NFRs en patterns concretos y enumerar componentes lógicos NUEVOS de Unit 2 (auth, BM UI integration, cleanup jobs).

**Filosofía MVP**: hereda casi todo de Unit 1 NFR Design (retry, breaker, errores, observability). Solo agrega lo específico Unit 2.

**Input artifacts:**
- `construction/unit2-knowledge-brand-voice/nfr-requirements/nfr-requirements.md`
- `construction/unit2-knowledge-brand-voice/nfr-requirements/tech-stack-decisions.md`
- `construction/unit2-knowledge-brand-voice/functional-design/business-rules.md` (R-AUTH-*, R-BC-*, R-UI-*)
- `construction/unit1-core-agente/nfr-design/*` (patterns que se reusan)

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — JWT secret management

¿Cómo gestionamos el `JWT_SECRET` y eventual rotación?

A) **Env var simple** — `JWT_SECRET` en `.env` (≥32 chars random). Sin rotación automática; cambio manual implica invalidar TODAS las sesiones existentes (acceptable en MVP con 3-5 users).
B) **AWS Secrets Manager** — secret centralizado, accedido vía AWS SDK. Más complejo, agrega infra dependency.
C) **Rotating keys con kid (key id)** — JWTs llevan `kid` header; el server mantiene un keyset con N keys activos para rotación graceful. Sin reemitir tokens válidos.
X) Otro

[Answer]: A

---

### Question 2 — Integración BM UI con Fastify

¿Cómo servimos el BM UI dashboard?

A) **Mismo Fastify instance, rutas `/admin/*`** — un solo proceso Node; `@fastify/view` con EJS sirve HTML; `@fastify/static` sirve CSS. Simple, sin extra deployment unit.
B) **Sub-app Fastify aislada** — namespace `/admin/*` con su propio plugin tree y configs distintos (más estricto en CORS/CSP), pero mismo proceso.
C) **Proceso separado** — segundo Docker container "hermes-admin" que solo sirve BM UI y comparte DB. Mayor aislamiento de fallo y permisos.
X) Otro

[Answer]: A

---

### Question 3 — Activation race condition handling

R-BC-5 dice "activación atómica con constraint único parcial". ¿Cómo manejamos race conditions cuando 2 operadores intentan activar diferentes versiones al mismo tiempo?

A) **DB constraint + retry on conflict** — el `UNIQUE INDEX ... WHERE status='active'` previene 2 activas; si dos activate() corren simultáneo, uno gana el INSERT y el otro recibe 23505 unique violation → reintenta su `UPDATE current_active` con el nuevo estado y se aplica encima.
B) **SELECT FOR UPDATE row lock** — antes del UPDATE, hacer `SELECT ... FOR UPDATE` sobre la versión active actual; serializa activations. Más explícito pero más overhead.
C) **Optimistic concurrency con version_number** — agregar columna `version_number` que se incrementa; UPDATE incluye `WHERE version_number = X`; si row no matchea, conflict.
X) Otro

[Answer]: A

---

### Question 4 — Diff visualization implementation

R-UI-3 muestra diff visual entre versions. ¿Server-side render o client-side?

A) **Server-side render** — backend usa `diff` (jsdiff) para calcular el diff entre `version_id_A` y `version_id_B`, retorna HTML pre-renderado (`<span class="add">` y `<span class="del">`). Cliente solo renderea HTML. Mínimo JS cliente.
B) **Client-side render** — backend retorna ambos textos raw; cliente importa `diff` (~10kb minified) y renderea. Permite interactividad (hover, ignore whitespace toggle, etc.).
C) **Hybrid** — server calcula el diff base; cliente agrega interactividad on-top.
X) Otro

[Answer]: A

---

> Cuando termines de responder, escribe **"listo"** y genero los 2 artefactos (`nfr-design-patterns.md` + `logical-components.md`).

---

## Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1=A, Q2=A, Q3=A, Q4=A — sin ambigüedades
- [x] Generar `nfr-design-patterns.md` — 9 secciones (auth: bcrypt wrapper + JWT lifecycle + middleware + scope guard + brute-force + logout; atomicity: race condition retry + sign-off TX; UI integration: EJS + static + PRG form pattern; diff server-side; logging audit; reliability cleanup jobs; security CSRF + sessionStorage + anti-enumeration; out-of-scope)
- [x] Generar `logical-components.md` — delta vs Unit 1: 5 services nuevos, 5 plugins, 5 repos, 4 controllers, 3 jobs, 9 EJS templates, sin cambios infra (mismo Docker Compose con 2 containers)
- [x] Verificar consistencia con NFR requirements + business-rules + tech-stack-decisions
- [x] Security compliance summary
- [x] Actualizar `aidlc-state.md`
- [ ] Presentar completion message (2-option)
