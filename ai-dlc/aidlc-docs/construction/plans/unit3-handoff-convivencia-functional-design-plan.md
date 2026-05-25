# Functional Design Plan — Unit 3: Handoff & Convivencia

> **Actualización 2026-05-25 — Oct8ne validado OUT como chat activo**: usuario confirmó que Oct8ne **no está activo** como sistema de chat en Patprimo; solo se usa para envío batch outbound vía plantillas Excel (sin integración directa, sin widget en vivo). Esto reformula Q2 (target de handoff) y Q5 (despliegue gradual) — ver bloque "Cambios derivados" al final. Las preguntas Q1, Q3, Q4, Q6 NO cambian. Blocker resuelto: ver `aidlc-docs/blockers/oct8ne-validation-pending.md`.

## Plan Overview

**Unit**: Unit 3 — Handoff & Despliegue Gradual + Operations Dashboards (la más grande, 8 stories)
**Modules in scope**:
- M5 Human Handoff (triggers, paquete contexto, transferencia a canal humano)
- M8 Gradual Rollout (kill switch + dark launch %) — reemplaza A/B Hermes-vs-Oct8ne
- M7 Observability **read-path** (dashboards, drill-down, alertas)
- Extensiones: M3 SFCC (`getOrderHistory`) + M6 Compliance (PII handling para handoff)

**Stories in scope (8)**:
- E2-S1 — Dashboard del operador con KPIs
- E2-S2 — Drill-down de escalamientos
- E2-S3 — Alertas configurables
- E3-S1 — Detección de triggers de handoff
- E3-S2 — Construcción del paquete de contexto
- E3-S3 — Transferencia operativa al canal humano (target reformulado — ya no Oct8ne)
- E3-S4 — Botón "Hablar con persona" persistente
- E4-S2 — Despliegue gradual con kill switch + dark launch (reformulada — ya no A/B Oct8ne)

**Cierra**: OD-7 (estrategia de despliegue gradual sin Oct8ne)

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

### Question 2 — Target del handoff humano (cierra OD-7) — REFORMULADA POST-VALIDACIÓN OCT8NE

> **Contexto nuevo**: Oct8ne ya **no está activo** como chat en Patprimo. Sin widget legacy al cual transferir, hay que elegir un canal humano alternativo para el MVP. Demo Day = 2026-06-09 (15 días). Pragmatismo > perfección.

¿A qué canal humano transferimos cuando se dispara el handoff (E3-S3)?

A) **Stub MVP + email offline** — handoff trigger detecta, paquete de contexto se construye y persiste (`turn_log_audit` + nueva tabla `handoff_ticket`); bot muestra al cliente "te conectamos pronto, déjanos tu email o WhatsApp y un asesor te contacta en X horas hábiles"; sistema envía email automático a `cx@patprimo.com` con paquete pre-formateado. Sin canal síncrono real. **+0.5 día**. Demo defendible: muestra detección + paquete + entrega offline; integración síncrona = Fase 2.
B) **WhatsApp Business Cloud API adelantada** — handoff abre conversación en WhatsApp Business con número verificado de Patprimo; primer mensaje del agente trae paquete de contexto resumido; agentes humanos atienden desde WhatsApp Business Manager. **+3-5 días + dependencia externa**: requiere aprobación Meta Business, número verificado y onboarding del equipo CX. Riesgo de Demo Day si no llega a tiempo la verificación.
C) **Widget propio Hermes con vista de agente humano** — extender el frontend de Unit 1 con una vista de agente (mini-chat dedicado para CX); cuando hay handoff, cliente sigue en el mismo widget y agente humano lo atiende vía vista web autenticada. UX cohesiva. **+3-5 días dev** + onboarding equipo CX al widget + auth básica para agentes.
D) **Salesforce Service Cloud** — si PASH tiene licencia Service Cloud, integrar handoff con creación de caso + chat asistido. **+5-10 días** + bloqueado por OD pendiente: PASH no ha confirmado disponibilidad de Service Cloud.
X) Otro

**Recomendación tentativa**: **A (stub MVP + email offline)**. Razones: (1) garantiza Demo Day el 2026-06-09 sin dependencia externa; (2) demuestra el mecanismo completo de Hermes (detección, paquete, entrega) que es lo defendible ante el CTO; (3) WhatsApp/Service Cloud/widget propio se evalúan en Fase 2 con datos del piloto; (4) ya no hay urgencia "no degradar Oct8ne" porque Oct8ne no existe como chat. Combinable con un fallback de teléfono manual si el cliente prefiere.

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

### Question 5 — Mecanismo de despliegue gradual (sin Oct8ne) — REFORMULADA POST-VALIDACIÓN OCT8NE

> **Contexto nuevo**: Sin Oct8ne activo no hay A/B "Hermes vs otro bot". El riesgo "Hermes degrada algo que funciona" desaparece (no había chat funcionando antes). Pero seguimos necesitando un mecanismo de despliegue gradual para mitigar el riesgo de Hermes degradar la experiencia "sin chat" actual (que aunque sea baja, no es cero — al menos cliente no recibía respuesta equivocada). Cierra MH-9 reformulado.

¿Cómo controlamos el porcentaje de tráfico que ve a Hermes durante el soft launch?

A) **Kill switch global** — flag `HERMES_ENABLED` en config (env var o tabla `system_config`); si false → widget muestra mensaje "atención por correo en horario de oficina" sin levantar chat de IA. Toggle manual por operador desde BM UI (extiende Unit 2). **+0.5 día**. Simple pero binario (todo o nada).
B) **Dark launch incremental** — variable `HERMES_TRAFFIC_PERCENTAGE` (0–100); `hash(sessionId) % 100 < N` decide si la sesión ve Hermes o el mensaje "atención offline". Permite ramp 5% → 10% → 25% → 100% según KPIs Demo Day → semana 1 → semana 2. **+1 día**. Para clientes recurrentes: hash incluye `customerIdHash` cuando existe → mismo cliente ve el mismo lado del split cross-session.
C) **Kill switch + dark launch combinados** — opción B + opción A como override absoluto del operador. El operador puede subir/bajar % o apagar todo desde BM UI. **+1.5 días**. Configuración persistida en `system_config`; cambios sin redeploy.
D) **Sin mecanismo automático — toggle manual via deploy** — si Hermes degrada, alguien hace deploy con feature flag apagado (downtime de minutos). **+0 día** pero mayor riesgo operacional + no defendible en Demo Day ante el CTO si pregunta por rollback.
X) Otro

**Recomendación tentativa**: **C (kill switch + dark launch)**. Razones: (1) el PRD §13 línea 1504 ya promete "soft launch al 5% sin incidente crítico 48h" como gate — necesita un mecanismo de %; (2) kill switch absoluto como red de seguridad es defendible ante CTO; (3) +1.5 días es asumible dentro del tiempo restante para Demo Day; (4) reutiliza la BM UI de Unit 2, no requiere infra extra.

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
- [ ] Generar `business-logic-model.md` — handoff workflow + gradual rollout + dashboard queries + alerting workflow
- [ ] Generar `business-rules.md` — R-HO-* (handoff), R-ROLL-* (rollout/kill switch), R-DASH-* (dashboards), R-ALERT-* (alerts), R-SENT-* (sentiment)
- [ ] Generar `domain-entities.md` — Handoff, HandoffPackage, HandoffTicket, RolloutConfig, KillSwitchState, AlertRule, KpiSnapshot, EscalationView
- [ ] Verificar consistencia con AC Gherkin de las 8 stories (E3-S3 y E4-S2 requieren refactor de stories.md en sesión aparte)
- [ ] Security compliance summary
- [ ] Actualizar `aidlc-state.md`
- [ ] Presentar completion message (2-option)

---

## Cambios derivados (registro)

### Reformulaciones aplicadas a este plan (2026-05-25)
| Pregunta | Antes | Ahora |
|---|---|---|
| Q2 | "Integración con Oct8ne" — opciones API/webhook/feature flag widget/stub | "Target del handoff humano" — opciones stub+email / WhatsApp / widget propio / Service Cloud |
| Q5 | "Identificación A/B routing — clientes recurrentes" — opciones hash session/customer/cookie | "Mecanismo de despliegue gradual" — opciones kill switch / dark launch % / combinado / manual deploy |

### Pendientes diferidos (NO bloquean Unit 3 FD)
Estos artefactos quedan inconsistentes hasta refactor explícito en sesión separada:
- **`aidlc-docs/inception/user-stories/stories.md`**: E3-S3 (renombrar + reformular AC sin Oct8ne widget), E4-S2 (reescribir como kill switch + dark launch), MH-4 desc (target ya no Oct8ne), MH-9 desc (ya no convivencia A/B).
- **`ai-dlc/prd.md`**: §3 estado actual (Oct8ne NO chat activo), §10 KPIs Q3 baseline 50–60% (recalibrar — baseline real = ausencia de chat asistido), §12 riesgos (quitar "Hermes degrada Oct8ne"), §11 Gantt (quitar "MH-9 Convivencia Oct8ne setup"), §13 Paso 0 #7 (cerrar resuelto), §4.5 Journey 4 (paso 4 widget Oct8ne → nuevo target), líneas 443/780.
- **`aidlc-docs/inception/application-design/unit-of-work.md` (Unit 3)**: ajustar descripción de M8 (A/B Routing → Gradual Rollout).
- **`aidlc-docs/inception/application-design/component-methods.md`**: ajustar `IABRoutingService` (renombrar a `IRolloutService` o ajustar contratos).

El Unit 3 FD se diseñará contra estas reformulaciones (Q2/Q5 respondidas en este plan) — el refactor documental de stories/PRD se hace después, sin bloquear Construction.
