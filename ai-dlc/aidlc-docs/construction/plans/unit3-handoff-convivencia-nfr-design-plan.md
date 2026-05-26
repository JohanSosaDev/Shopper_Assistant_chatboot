# NFR Design Plan — Unit 3: Handoff & Despliegue Gradual

## Plan Overview

**Unit**: Unit 3
**Purpose**: Traducir las NFRs Unit 3 en patterns concretos y enumerar componentes lógicos NUEVOS (adapters SMTP/Slack, scheduler integration, rollout cache, sentiment scorer, alert evaluator).

**Filosofía MVP**: hereda casi todo de Units 1 y 2 NFR Design (retry, breaker, error class hierarchy, helmet, role middleware). Solo agrega lo específico de los 5 servicios nuevos.

**Input artifacts:**
- `construction/unit3-handoff-convivencia/nfr-requirements/nfr-requirements.md`
- `construction/unit3-handoff-convivencia/nfr-requirements/tech-stack-decisions.md`
- `construction/unit3-handoff-convivencia/functional-design/*` (3 docs)
- `construction/unit1-core-agente/nfr-design/*` (patterns reusados: withRetry, withCircuitBreaker, error hierarchy)
- `construction/unit2-knowledge-brand-voice/nfr-design/*` (auth middleware, role guard)

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Config de resilience para SMTP send

`withRetry` + `withCircuitBreaker` de Unit 1 son reusados, pero hay que fijar parámetros exactos. ¿Qué config?

A) **Retry 3 attempts, baseDelay 1000ms, exponential backoff; Breaker: 5 failures consecutivos → abre 60s; 1 success en half-open → cierra**. Conservador, da margen a mailhog en dev y a SMTP corporativo Fase 2.
B) **Retry 5 attempts, baseDelay 500ms, exponential; Breaker: 10 failures → abre 120s; 2 successes para cerrar**. Más resiliente pero peor UX cuando SMTP está degradado (cliente espera más).
C) **Retry 2 attempts, baseDelay 2000ms; Breaker: 3 failures → abre 30s**. Más agresivo en short-circuit; recupera más rápido pero menos tolerante.
X) Otro

**Recomendación tentativa**: **A**. Razones: (1) consistente con la config de Bedrock en Unit 1; (2) mailhog dev casi nunca falla → retries casi nunca se ejercitan; (3) en Fase 2 con SMTP corporativo, 5 failures consecutivos es una señal real (no transitorio).

[Answer]: A — `withRetry({attempts: 3, baseDelayMs: 1000, backoff: 'exponential', maxDelayMs: 8000})` + `withCircuitBreaker({failureThreshold: 5, openDurationMs: 60_000, halfOpenSuccessesToClose: 1})`. Worst case: 1s + 2s + 4s = ~7s antes de abrir breaker. Mismo perfil que Bedrock client en Unit 1 NFR-D.

---

### Question 2 — Implementación del cache de `system_config` (TTL 60s)

`RolloutGate` consulta `system_config` constantemente; FD fijó cache 60s in-memory (R-ROLL-5). ¿Cómo implementamos?

A) **In-memory `Map<'config', {value, expiresAt}>` custom** — wrapper de ~20 LoC sobre `Map`; sin lib externa. Refresh on miss + on TTL expiration.
B) **`node-cache` library** (npm `node-cache`) — TTL nativo, helpers built-in (`set`, `get`, `del`, `flushAll`); ~3kb minified.
C) **`lru-cache` library** — más features (size-based eviction, etc.) pero overkill para 1 key.
X) Otro

**Recomendación tentativa**: **A (custom)**. Razones: (1) cache de 1 single key (`system_config`); (2) wrapper trivial (~20 LoC); (3) elimina supply chain dep; (4) testeable directamente (sin mock de lib externa).

[Answer]: A — Wrapper `TtlCache<K, V>` genérico ~20 LoC sobre `Map<K, {value: V, expiresAt: number}>` con métodos `get/set/invalidate/clear`. Default TTL 60s. Reusable también para futuros caches in-memory de single-row tables. Test PBT-friendly (función pura sobre Map state).

---

### Question 3 — Sentiment lexicon loading

El lexicón JSON (`prompts/sentiment_lexicon_es_co.json`) se carga al boot. ¿Cómo lo hacemos?

A) **Sync read at boot via `readFileSync` en composition root** — antes de que Fastify start; archivo se lee 1 vez; failures en read abortan startup (fail-fast). Lexicón inmutable en memoria post-boot.
B) **Async read en lazy init en `SentimentScorer` constructor** — más TypeScript-idiomatic pero asincronía complica el wiring.
C) **Embed lexicon as TS module** (`import lexicon from './sentiment-lexicon-es-co.json'`) — bundler/TS resolve lo embebe; cero runtime FS access. Cambios requieren rebuild del bundle.
X) Otro

**Recomendación tentativa**: **A (sync read at boot)**. Razones: (1) fail-fast si el archivo falta → no se descubre tarde; (2) sin async noise en constructor; (3) permite editar `prompts/sentiment_lexicon_es_co.json` sin rebuild en MVP (lo que es relevante porque el lexicon es de configuración, no de código).

[Answer]: A — `readFileSync('prompts/sentiment_lexicon_es_co.json', 'utf8')` + `JSON.parse` + Zod validation con schema `LexiconEntrySchema[]` (mismo patrón que prompts seed de Unit 1). Si parse o validation fallan → throw en composition root → Fastify no startea (fail-fast). Lexicon como `readonly LexiconEntry[]` inyectado al `SentimentScorer` via DI.

---

### Question 4 — Pattern de AlertEvaluator tick

Cada tick (60s) evalúa N reglas activas. ¿Pattern de ejecución?

A) **Single advisory lock por tick + eval secuencial de reglas** — `pg_try_advisory_lock(JOB_ID)` al inicio del tick; itera reglas con `for-of await`; al final libera. Si el tick toma >60s, el siguiente lo skipea. **Simple, sin races.**
B) **Sin lock + eval paralelo (`Promise.all`)** — reglas se evalúan concurrentemente; menor wall-clock total. Riesgo: 2 ticks concurrentes pueden duplicar notificaciones si throttling no se persiste atómicamente.
C) **Per-rule advisory lock + eval paralelo** — granularidad fina; cada regla con su propia lock; reglas no se duplican pero ticks distintos pueden correr otras reglas en paralelo.
X) Otro

**Recomendación tentativa**: **A (single lock + secuencial)**. Razones: (1) con ≤15 reglas y eval <100ms cada una → total <1.5s; cabe holgado en 60s; (2) sin races posibles; (3) simplicidad operativa; (4) si en Fase 2 hay >50 reglas, migrar a C.

[Answer]: A — `pg_try_advisory_lock(ALERT_EVALUATOR_LOCK_ID = 47821001)` al inicio del tick; si retorna false → log warn + skip (siguiente tick reintenta); si true → `for-of await` sobre `alert_rules WHERE active=true`; `pg_advisory_unlock` en `finally`. Cada evaluación lleva su propio TX corto. Sin Promise.all, sin races sobre throttling.

---

### Question 5 — Email template rendering (HTML + plain text)

R-HOD-4 dice email multipart HTML+plain. ¿Cómo lo renderizamos?

A) **Template literal TS inline en `email-renderer.ts`** — funciones `renderHandoffEmailHtml(pkg)` y `renderHandoffEmailText(pkg)` retornan strings; templating mínimo con `${...}` interpolation. Sin EJS para emails (EJS es para BM UI de Unit 2). Cero archivos extra.
B) **Archivos `.ejs` separados** — `templates/handoff-email.ejs` + `templates/handoff-email.txt.ejs`; reusa `@fastify/view` con EJS. Más estructura para Fase 2 (multi-marca emails distintos).
C) **`mjml` library** para emails responsive — overkill para email interno; client de email de CX seguramente es Gmail/Outlook desktop que renderiza HTML simple bien.
X) Otro

**Recomendación tentativa**: **A (template literals inline)**. Razones: (1) un solo tipo de email en MVP; (2) cero deps adicionales; (3) más fácil de testear (función pura); (4) si Fase 2 trae 4 marcas con emails distintos, migrar a B sin breaking change.

[Answer]: A — `src/services/email-renderer.ts` con 2 funciones puras: `renderHandoffEmailHtml(pkg: HandoffPackage): string` y `renderHandoffEmailText(pkg: HandoffPackage): string`. Template literals con `${...}` interpolation; escape de HTML via helper `escapeHtml` para PII fields (evita XSS si email se abre en webmail). Cero deps. Subject construido aparte con función `renderHandoffEmailSubject(ticket)`.

---

> Cuando termines de responder, escribe **"listo"** y genero los 2 artefactos: `nfr-design-patterns.md` (patterns concretos para resilience, cache, scheduler, sentiment, alerting, rollout gate, email rendering, RBAC middleware, error mapping) + `logical-components.md` (services/plugins/repos/jobs nuevos, sin cambios infra).

---

## Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1–Q5; resolver ambigüedades — 5/5 aplicadas (A/A/A/A/A)
- [x] Generar `nfr-design-patterns.md` — 11 secciones (SMTP resilience, Slack adapter, AlertEvaluator + advisory lock, RolloutGate cache + TtlCache code, Sentiment loader + scorer + PBT props, Email rendering + escapeHtml, RBAC middleware, Error mapping con 6 nuevos errors, Logging extension, Out-of-scope, Security Compliance)
- [x] Generar `logical-components.md` — 9 secciones (Topology con mailhog nuevo, 10 services + 3 adapters + 5 plugins + 6 repos + 6 controllers + 1 job nuevos, Composition root wiring delta, Pipeline /chat con 2 steps nuevos pre-generate_response, Tests Code Gen, package.json + docker-compose deltas, Out-of-scope, Security Compliance)
- [x] Verificar consistencia con NFR requirements + tech-stack-decisions + FD
- [x] Security compliance summary
- [x] Actualizar `aidlc-state.md`
- [x] Presentar completion message (2-option)
