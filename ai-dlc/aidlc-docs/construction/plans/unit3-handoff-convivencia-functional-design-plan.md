# Functional Design Plan — Unit 3: Handoff & Convivencia

## Plan Overview

**Unit**: Unit 3 — Handoff & Convivencia + Operations Dashboards (la más grande, 8 stories)
**Modules in scope**:
- M5 Human Handoff (triggers, paquete contexto, transferencia Oct8ne)
- M8 A/B Routing (split + auto-rollback) — complementa el CRUD de Unit 2
- M7 Observability **read-path** (dashboards, drill-down, alertas)
- Extensiones: M3 SFCC (`getOrderHistory`) + M6 Compliance (PII handling para handoff)

**Stories in scope (8)**:
- E2-S1 — Dashboard del operador con KPIs
- E2-S2 — Drill-down de escalamientos
- E2-S3 — Alertas configurables
- E3-S1 — Detección de triggers de handoff
- E3-S2 — Construcción del paquete de contexto
- E3-S3 — Transferencia operativa al widget Oct8ne
- E3-S4 — Botón "Hablar con persona" persistente
- E4-S2 — Convivencia A/B Oct8ne con rollback automático

**Cierra**: OD-7 (estrategia A/B Oct8ne)

**Input artifacts:**
- `aidlc-docs/inception/application-design/unit-of-work.md` (Unit 3 definition)
- `aidlc-docs/inception/application-design/component-methods.md` (IHandoffService, IABRoutingService, IDashboardService, IAlertingService)
- `aidlc-docs/inception/user-stories/stories.md` (AC Gherkin de E2-S1..S3, E3-S1..S4, E4-S2)
- PRD §7 Journey 4 (Andrea / handoff Atmos)

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Sentiment detection method (R-MVP)

R-SH-1 (Unit 1 input/output guardrails) no incluye sentiment. ¿Cómo detectamos sentimiento negativo para handoff trigger (E3-S1)?

A) **Heurística keywords + score binario/lineal** — lista de palabras negativas en español Col (decepcionado, molesto, horrible, pésimo, queja, exigir, devolver YA, etc.) + intensificadores (MAYÚSCULAS, repetición vocálica como "horriiible", signos de exclamación). Score derivado: 0 = neutro, -1 = fuerte. Trigger handoff si score < -0.5. MVP simple, sin lib externa.
B) **Sentiment library Node (vader / sentiment / node-sentiment)** — pre-trained en inglés mayormente; requiere traducción o tunning ES. Más sofisticado pero ES coverage limitado.
C) **LLM call adicional al Bedrock** — pedir al modelo "rate sentiment -1 to 1". +cost por turn, +latency 1-2s. Más preciso pero rompe budget.
D) **Hybrid keywords + LLM solo si keywords ambiguos** — pragmatic; primer pase keywords, escala a LLM si necesario.
X) Otro

[Answer]: 

---

### Question 2 — Integración con Oct8ne (cierra OD-7)

El handoff requiere transferir el cliente al widget Oct8ne con paquete de contexto pre-cargado. ¿Cómo lo implementamos en MVP?

A) **REST API call directo a Oct8ne** — Hermes invoca endpoint `POST /api/oct8ne/handoff` con payload; Oct8ne crea ticket pre-cargado para agente humano. **Requiere**: docs/credenciales Oct8ne API (probable trabajo de coordinación con vendor Oct8ne).
B) **Webhook bridge bidireccional** — Hermes expone endpoint `POST /webhooks/oct8ne/agent-event`; Oct8ne consulta paquete de contexto cuando lo necesita via `GET /handoff/:conversationId/package`. Más complejo pero menos dependencia de Oct8ne API.
C) **Feature flag a nivel de widget cliente** — el widget mismo decide cuándo cambiar de Hermes a Oct8ne (cliente recibe "te paso con persona" + abre el widget Oct8ne legacy en el mismo browser). Sin backend integration con Oct8ne.
D) **Out-of-scope MVP — stub que loguea y muestra mensaje** — handoff trigger funciona, paquete de contexto se construye y se loguea, pero NO se ejecuta transferencia real. Demo muestra "esto se conectaría con Oct8ne en producción". Oct8ne integration real → Fase 2. Mucho más rápido.
X) Otro

[Answer]: 

---

### Question 3 — Dashboard query strategy

Los dashboards de E2-S1..S3 leen del `turn_log_audit` (write-path de Unit 1). ¿Estrategia de read?

A) **Queries directas a `turn_log_audit`** con indexes apropiados (ya planeados en Unit 1 §5 indexes — timestamp + conversation_id). Aggregations en SQL cada request del dashboard. Simple, MVP.
B) **Materialized views actualizadas por trigger** — vistas pre-computadas para los 6 KPIs principales; refresh on INSERT en turn_log_audit. Performance mejor a escala pero más complejo.
C) **Snapshot tables actualizadas por job periódico** — tabla `kpi_snapshots` poblada cada 5 min con valores agregados; dashboard lee de ahí. Más resiliente pero datos no real-time.
X) Otro

[Answer]: 

---

### Question 4 — Canales de delivery de alertas

E2-S3 dice alertas configurables ("Slack/email/webhook"). En MVP, ¿qué soportamos?

A) **Solo log structured (pino warn/error a stdout)** — alertas visibles solamente en `docker compose logs`. Cero infra externa, cero setup.
B) **Slack webhook único** — env var `SLACK_WEBHOOK_URL` apunta a un Slack incoming webhook del canal `#hermes-alerts`. Notificación con texto + link al dashboard. MVP defendible.
C) **Slack + email (via SMTP)** — agregar SMTP config (sendmail or service); 2 canales redundantes.
D) **PagerDuty / formal alerting** — Fase 2 territory.
X) Otro

[Answer]: 

---

### Question 5 — Identificación A/B routing — clientes recurrentes

El A/B (E4-S2) decide qué bot (Hermes vs Oct8ne) ve cada cliente. ¿Cómo garantizamos consistencia para clientes recurrentes?

A) **Hash(sessionId)** puro — cada nueva session puede ver bot distinto. Estadísticamente OK con tráfico alto, pero un mismo customer puede ver bots distintos en visitas diferentes. **Hipotecaría** mediciones de "experiencia del cliente recurrente".
B) **Hash(customerIdHash || sessionId)** — si el cliente está logueado y tiene `customerIdHash`, esa identidad determina el bot consistentemente cross-session. Guests siguen siendo random por session. Mejor para measurement A/B.
C) **Cookie persistent (`hermes_ab_assignment`) con TTL 30 días** — el primer hit asigna bot y persiste en cookie del browser. Funciona incluso para guests. Más complejo (cookies cross-domain en SFCC).
X) Otro

[Answer]: 

---

### Question 6 — Detección de keyword "Hablar con persona" / explicit handoff request

E3-S1 menciona "request explícito del cliente" como trigger. ¿Cómo lo detectamos?

A) **Regex closed list** — `(?i)\b(hablar|conectar|comunicar|pasar)\s+(con|a)\s+(un[ao]?\s+)?(persona|humano|agente|asesor|representante|real)\b` + variantes botón Web. Falsos negativos posibles.
B) **Expanded keyword bag + similarity** — lista de ~30 frases tipo + fuzzy match (Levenshtein, etc.). Mejor recall, más complejo.
C) **Detección en classify_intent** — el LLM ya clasifica intent en Unit 1 pipeline; agregar `intent="explicit_handoff_request"` a las opciones. Más natural.
X) Otro

[Answer]: 

---

> Cuando termines de responder, escribe **"listo"** y genero los 3 artefactos de Functional Design (`business-logic-model.md`, `business-rules.md`, `domain-entities.md`). No espero `frontend-components.md` aparte porque Unit 3 extiende el widget cliente de Unit 1 (handoff button) y el BM UI de Unit 2 (dashboards) — sin frontend completamente nuevo.

---

## Generation Checklist (Part 2 — tras respuestas)

- [ ] Validar respuestas Q1–Q6; resolver ambigüedades
- [ ] Generar `business-logic-model.md` — handoff workflow + A/B routing + dashboard queries + alerting workflow
- [ ] Generar `business-rules.md` — R-HO-* (handoff), R-AB-* (A/B), R-DASH-* (dashboards), R-ALERT-* (alerts), R-SENT-* (sentiment)
- [ ] Generar `domain-entities.md` — Handoff, HandoffPackage, ABSplitConfig, ABRollbackRule, AlertRule, KpiSnapshot, EscalationView
- [ ] Verificar consistencia con AC Gherkin de las 8 stories
- [ ] Security compliance summary
- [ ] Actualizar `aidlc-state.md`
- [ ] Presentar completion message (2-option)
