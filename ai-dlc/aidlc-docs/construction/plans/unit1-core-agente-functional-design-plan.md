# Functional Design Plan — Unit 1: Core Agente

## Plan Overview

**Unit**: Unit 1 — Core Agente
**Modules in scope**: M1 Conversation + M3 SFCC + M4 Identity & Session + M6 Compliance + M7 Observability (write-path) + CC-1..4
**Stories in scope (7)**: E1-S1, E1-S2, E1-S3, E1-S4, E1-S5, E1-S6, E2-S4
**Purpose**: Definir el detalle de business logic, reglas y entidades de dominio para Unit 1. Technology-agnostic (no infra ni código aún).

**Input artifacts:**
- `aidlc-docs/inception/application-design/unit-of-work.md` (Unit 1 definition)
- `aidlc-docs/inception/application-design/unit-of-work-story-map.md` (las 7 stories asignadas)
- `aidlc-docs/inception/application-design/components.md` + `component-methods.md` + `services.md`
- `aidlc-docs/inception/user-stories/stories.md` (AC Gherkin de E1-S1..S6 + E2-S4)
- `ai-dlc/prd.md` (§5 casos, §6 principios, §7 journeys, §10 KPIs)

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Arquitectura del orquestador del turno (M1)

El orquestador del turno coordina identity → consent → intent classification → tool call → response → guardrails → logging. ¿Qué patrón implementamos?

A) **State machine explícita** — definimos estados (RECEIVED, IDENTITY_RESOLVED, CONSENT_GATED, INTENT_CLASSIFIED, TOOL_PENDING, TOOL_DONE, RESPONSE_GENERATED, GUARDRAIL_CHECKED, LOGGED). Cada transición es un método. **Pros**: trazabilidad excelente, fácil de testear, fácil de visualizar. **Cons**: más boilerplate.
B) **Pipeline secuencial con middleware-style** — array de "steps" que se ejecutan en orden con un context compartido (similar a Express middleware). Cada step decide si continuar o cortar. **Pros**: ergonómico, extensible, fácil agregar steps en Unit 2/3 (guardrails extra, etc.). **Cons**: orden implícito, menos visible.
C) **Función monolítica con steps inline** — `handleTurn()` es un método largo con secuencia clara de pasos sin abstracción. **Pros**: máxima simplicidad para MVP. **Cons**: tests más difíciles, scaling pobre.
X) Otro

[Answer]: B

---

### Question 2 — Semántica del consent gate (M6)

El cliente debe autorizar antes de procesar PII. ¿Cuándo se exige el consent?

A) **Consent al inicio (1ª interacción)** — bot saluda, pregunta consent en mensaje 1; si no responde "sí", siguiente mensaje cualquier consulta se gate hasta que dé consent. **Aceptado** persiste en `consent_log` y se reusa toda la sesión.
B) **Consent al cruzar PII boundary** — bot conversa libremente hasta que el cliente pide algo que requiere PII (ej. estado de pedido); ahí solicita consent. **Pros**: menos friction inicial; **Cons**: dos momentos de consent en algunas conversaciones.
C) **Ambos** — consent inicial obligatorio para "procesar conversación" + re-consent cuando se cruza PII boundary específico (consulta de pedido, datos de cuenta). Más estricto, más alineado a SIC 002/2024.
X) Otro

[Answer]: A

---

### Question 3 — Cobertura de PII anonymization en MVP

Para MVP local-only, ¿qué patrones de PII detecta y tokeniza el anonymizer (`<EMAIL_1>`, `<PHONE_1>`, etc.) antes de escribir al log?

A) **Email + teléfono + número de pedido + número de tarjeta + número de documento (cédula CC/CE)** — set completo retail Colombia
B) **Email + teléfono + número de pedido + número de tarjeta** — sin documento (raramente entra al chat)
C) **Solo email + teléfono** — mínimo viable; resto al log con hashing genérico
D) **Set A** + nombre completo cuando matchea patrón (capitalizado de 2+ palabras tras "soy" / "me llamo" / "mi nombre es")
X) Otro

[Answer]: A

---

### Question 4 — Capas de guardrails (M1)

¿Dónde y cómo aplicamos guardrails contra prompt injection y output peligroso?

A) **Solo input guardrails** — regex + heurísticas contra patrones conocidos de jailbreak en el mensaje del cliente; si match → respuesta neutral sin pasar al LLM.
B) **Solo output guardrails** — dejamos al LLM responder con system prompt hardened; validamos la respuesta antes de enviar (no debe revelar prompt, no debe contener secretos, no debe ofrecer descuentos no autorizados).
C) **Input + output (recomendado)** — ambas capas; defensa en profundidad alineada con SECURITY-11.
D) **Input + output + sanitization de tool outputs** — además, sanear datos que vienen de SFCC antes de pasarlos al LLM (defensa contra prompt injection vía datos en el catálogo o notas del pedido). Más estricto.
X) Otro

[Answer]: C

---

### Question 5 — Frontend del chat widget (resuelve OD-5)

El widget del cliente vive embebido en SFCC. Para MVP:

A) **Vanilla JS bundle compilado** — un script JS minimalista que renderiza widget; el frontend SFCC lo incluye con `<script src>`. Sin React. **Pros**: minimal bundle (~30kb); cero conflictos con frameworks SFCC. **Cons**: menos ergonómico para desarrollar.
B) **React component publicado como librería externa** — la sigue cargando SFCC pero como bundle React (~150-200kb). **Pros**: dev experience mejor. **Cons**: bundle pesado; potencial conflict con stack SFCC.
C) **Out of scope MVP — usamos el widget Oct8ne actual como cascarón** (Hermes responde via API; el widget renderea respuestas como si vinieran de Oct8ne durante A/B). **Pros**: deploy más rápido; menos coordinación con frontend SFCC. **Cons**: dependencia del look-and-feel Oct8ne.
D) **Build mínimo en `hermes/widget/`** — vanilla JS empaquetado, distribuido como `widget.js` con docs; SFCC team decide cuándo lo integra. Permite desacoplamiento total.
X) Otro

[Answer]: A

---

### Question 6 — Cost controls y rate limiting de Bedrock

Bedrock cobra por token. Para MVP, ¿qué controles implementamos?

A) **Token budget hard cap per turn** (ej. max 2000 tokens out por respuesta) + **rate limit per IP** (30 req/min en `/chat`) + **rate limit per conversation** (10 turnos/min). Si se excede cualquiera → fail-closed con respuesta neutral.
B) **Solo rate limit per IP + per conversation** — sin token cap; confiamos en system prompt para mantener respuestas cortas. Más simple, menos defensivo.
C) **Token budget + rate limits + circuit breaker por costo agregado** (si costo diario supera $X USD → freeze el bot y notifica a Operador). Más defensivo, más complejo.
X) Otro

[Answer]: A

---

> Cuando termines de responder, escribe **"listo"** y procedo a (a) validar respuestas, (b) generar los 3 artefactos de Functional Design para Unit 1.

---

## Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1–Q6 (Q1=B Pipeline, Q2=A Consent inicio, Q3=A PII set completo, Q4=C Input+Output, Q5=A Vanilla widget, Q6=A Token budget + rate limits) — sin ambigüedades
- [x] Generar `business-logic-model.md` — pipeline 12 steps con TurnContext + sequence diagram
- [x] Generar `business-rules.md` — 10 secciones (ID, Consent, Input/Output Guardrails, PII, Tools, Rate limits, Session, Errors, Security)
- [x] Generar `domain-entities.md` — 10 entidades con atributos + relaciones + state lifecycle (ERD Mermaid)
- [x] Generar `frontend-components.md` — bundle vanilla JS ~30kb, 8 componentes, 6 flows, API contract, a11y, security
- [x] Verificar consistencia con AC Gherkin de las 7 stories
- [x] Security Compliance summary — SECURITY-05, 08, 09, 11, 13, 14, 15 aplicados; otros N/A
- [x] Actualizar `aidlc-state.md` con Unit 1 Functional Design complete
- [ ] Presentar completion message con `📋 REVIEW REQUIRED` + `✅ Continue to Next Stage` (2-option)
