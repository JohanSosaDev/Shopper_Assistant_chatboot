# Unit of Work Plan — Hermes

## Plan Overview

**Depth**: **Minimal** (per execution plan — los 3 units ya están pre-definidos en `requirements.md` §8 y ratificados en `application-design.md`). Esta stage **formaliza** la decomposición y genera los 3 artefactos mandatorios.

**3 Units pre-definidas:**

| # | Unidad | Módulos PRD §9 | Stories | Justificación |
|---|---|---|---|---|
| 1 | **Core Agente** | M1+M3+M4+M6+M7 + CC-1..4 | E1-S1..S6 + E2-S4 + E1-S2 | Entrega Caso 1 end-to-end con compliance baseline y observabilidad. Demo-able sin Units 2/3. |
| 2 | **Knowledge & Brand Voice** | M2 (stub) + M8 (partial) | E4-S1 (voz Patprimo) | Carga config Patprimo. M2 queda stub (no RAG en MVP). |
| 3 | **Handoff & Convivencia** | M5 + M8 (A/B routing) | E3-S1..S4 + E4-S2 + E2-S1..S3 | Handoff con Oct8ne + A/B con rollback + dashboards de operación. Cierra el loop MVP. |

**Type**: Greenfield single-tenant monolith (TypeScript + Fastify monolithic plugin + single package).
**Terminología**: "Unidad de trabajo" = paquete cohesivo de stories que se diseñan + codifican juntos. **No** son micro-services — todos viven en el mismo proceso/repositorio.

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Ratificación de la decomposición

¿Confirmas las 3 unidades tal como están definidas, o quieres rebalancear?

A) **Confirmar las 3 unidades** tal como están (recomendado — ya validadas en Requirements y Application Design)
B) **Mover algunos componentes** — describe los cambios después del tag [Answer]:
C) **Fusionar Unit 2 + Unit 3** en una sola — porque ambas se ejecutan después de Unit 1 y tienen interdependencia (brand config se usa en handoff package)
D) **Dividir Unit 1** en sub-units — porque Unit 1 carga ~70% del esfuerzo
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

### Question 2 — Ubicación del código compartido (`lib/`)

Code utilities cross-unit (hashing, retry, circuit-breaker, PII detection, time helpers, etc.) viven en `hermes/src/lib/`. ¿Cómo asignamos su ownership?

A) **Unit 1 es dueño de `lib/`** — Unit 1 crea las utilidades base (es el primero y tiene la mayoría de necesidades cross-cutting); Units 2 y 3 las consumen
B) **`lib/` es shared, sin owner único** — cualquier unit puede agregar utilities; reglas de naming claras evitan conflicts (ej. `lib/hashing.ts`, no `lib/m1-hashing.ts`)
C) **Cada unit tiene su propio `lib/`** — `services/m1/lib/`, `services/m5/lib/`, etc. (más aislamiento, posible duplicación)
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

### Question 3 — Cross-unit shared schemas (`models/`)

Los Zod schemas / TS types compartidos entre units (ej. `ConversationId`, `BrandId`, `Iso8601`, `CustomerIdHash`) van en `hermes/src/models/`. ¿Política?

A) **`models/shared/` para tipos comunes + `models/<feature>/` para tipos específicos** — separación explícita; lo común se discute en review, lo específico cada unit lo agrega libremente
B) **Todo plano en `models/`** — sin sub-folders; cada archivo es un dominio de tipos (ej. `models/conversation.ts`); cualquier unit puede agregar pero modifica con cuidado
C) **`models/` es Unit 1 ownership** — Units 2 y 3 piden extensiones via PR review (más estricto, más coordinación)
X) Otro (describir después del tag [Answer]:)

[Answer]: C

---

> Cuando termines de responder, escribe **"listo"** y procedo a (a) validar respuestas, (b) generar los 3 artefactos mandatorios.

---

## Unit Generation Checklist (Part 2 — tras respuestas)

- [x] Validar respuestas Q1–Q3 (Q1=A confirmar, Q2=A Unit 1 dueño lib/, Q3=C Unit 1 dueño models/)
- [x] Generar `aidlc-docs/inception/application-design/unit-of-work.md` — definiciones formales con code organization
- [x] Generar `aidlc-docs/inception/application-design/unit-of-work-dependency.md` — matriz + integration points + rollback
- [x] Generar `aidlc-docs/inception/application-design/unit-of-work-story-map.md` — mapping 16/16 + cobertura 10/10 MH
- [x] Verificar que las 16 stories están asignadas a exactamente 1 unidad (Unit 1: 7, Unit 2: 1, Unit 3: 8)
- [x] Verificar que cada unidad puede entregar valor independientemente
- [x] Actualizar `aidlc-state.md` con Units Generation complete
- [ ] Presentar completion message con `📋 REVIEW REQUIRED` + `🚀 WHAT'S NEXT`
