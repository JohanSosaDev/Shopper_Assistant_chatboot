# Story Generation Plan — Hermes

## Story Plan Overview

Este plan estructura cómo se convertirá el material de input (PRD §5 Casos, §7 Journeys, §9 Roles, requirements.md §5 MUST HAVE features) en stories accionables con acceptance criteria. El plan tiene dos partes: (1) **decisiones de metodología** que el usuario aprueba, y (2) **checklist de generación** que se ejecuta en Part 2.

**Input artifacts disponibles:**
- PRD §5 — 5 casos de uso top
- PRD §7 — 5 user journeys detallados
- PRD §9 — 7 personas (Mapa de roles)
- `requirements.md` §5 — 10 features MUST HAVE en alcance
- `requirements.md` §8 — 3 unidades de trabajo

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Breakdown approach

¿Cómo organizamos las stories?

A) **User Journey-Based** — stories siguen los 5 journeys del PRD §7 como epics; substories por interacción dentro de cada journey
B) **Feature-Based** — stories organizadas por las 10 features MH-1 a MH-10 del PRD §8 (1 epic por feature, stories por sub-feature)
C) **Persona-Based** — stories agrupadas por las 7 personas del PRD §9 (un epic por persona, stories por su necesidad)
D) **Hybrid Journey+Persona** — Journey como epic, dentro de cada Journey las stories explícitas por persona involucrada (recomendado para Hermes: liga la experiencia del cliente con las necesidades operativas de Operator/Brand Manager/Compliance)
E) **Hybrid Epic-por-Unidad-de-trabajo** — Epic = Unit 1/Unit 2/Unit 3 de requirements.md §8 → stories dentro alineadas al value delivery del MVP
X) Otro (describir después del tag [Answer]:)

[Answer]: D

---

### Question 2 — Story format

¿Qué formato usamos para escribir cada story?

A) **Estándar "Connextra" / Mike Cohn**: *Como [persona], quiero [acción], para [beneficio]*
B) **Job Story (Alan Klement)**: *Cuando [situación], quiero [motivación], para [resultado]* — alineado con el formato JTBD que ya está en PRD §1
C) **Lean / "Just enough"**: título + 1 línea de propósito + acceptance criteria (sin formato fijo de narrativa)
X) Otro (describir después del tag [Answer]:)

[Answer]: B

---

### Question 3 — Acceptance criteria format

¿Cómo redactamos los acceptance criteria de cada story?

A) **Gherkin / BDD (Given / When / Then)** — facilita generar test cases automáticos en Construction Phase
B) **Lista numerada de condiciones verificables** ("1. El sistema responde en <30 seg. 2. La respuesta cita el número de orden. 3. ...")
C) **Checklist de criterios + ejemplos** (lista de criterios + 1-2 ejemplos de input/output esperado)
D) **Mix G/W/T para flujos críticos + checklist para todo lo demás** — pragmático según complejidad
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

### Question 4 — Story granularity

¿Cuán pequeñas deben ser las stories?

A) **Fina (1 story = 1 acción atómica del usuario)** — más stories, mejor para sprints cortos, más overhead
B) **Media (1 story = 1 sub-feature de una MH)** — ej. dentro de MH-1 estado de pedido: una story por "identifica al cliente", "consulta SFCC OMS", "renderiza estado con tracking"
C) **Gruesa (1 story = 1 MH feature completa)** — 10 stories totales para las 10 MH; cada una grande
D) **Adaptativa según riesgo/complejidad** — features con tool calls (MH-1, MH-4) en granularidad media; features de config (MH-3, MH-9) en granularidad gruesa
X) Otro (describir después del tag [Answer]:)

[Answer]: D

---

### Question 5 — Persona depth

¿Cuánto detalle en cada persona del personas.md?

A) **Bio completo** — nombre, edad, contexto, motivaciones, frustraciones, tech savviness, goals, ejemplo de día típico (~150-200 palabras por persona)
B) **Operacional minimalista** — rol, acceso, responsabilidades, dolor que Hermes resuelve, métrica de éxito (lista compacta)
C) **Hybrid** — bio completo para los 3 personas críticos al MVP (Cliente final, Agente humano, Operador/Daniela); operacional minimalista para los otros 4
X) Otro (describir después del tag [Answer]:)

[Answer]: B

---

### Question 6 — Mapping requerido en cada story

¿Qué tags/links debe llevar cada story para traceability?

A) **Mínimo**: persona + acceptance criteria
B) **Estándar**: persona + MH-feature ID (MH-1...MH-10) + Módulo PRD §9 (M1...M8) + acceptance criteria
C) **Comprehensive**: estándar + Journey PRD §7 + Caso de uso PRD §5 + Unidad de trabajo (Unit 1/2/3) + principios visibles (P1-P7) + SECURITY rules aplicables
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

### Question 7 — Alcance de las stories

¿Hasta dónde alcanza el set de stories que generamos en esta iteración?

A) **Solo MUST HAVE (MH-1 a MH-10)** — estricto al scope confirmado en Q3 de requirements (recomendado)
B) **MUST HAVE + 1-2 Should Have más críticos** — incluir SH-1 (Caso 2 disponibilidad) y SH-3 (dashboard drill-down) como stories futuras
C) **MUST HAVE + todas las Should Have como stories "Fase 2"** marcadas explícitamente
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

> Cuando termines de responder, escribe **"listo"** y procedo a (a) validar respuestas, (b) construir el plan de generación final, (c) pedir tu aprobación explícita antes de generar stories.md y personas.md.

---

## Methodology Decisions Derived (de respuestas Q1–Q7)

| Decisión | Valor concreto |
|---|---|
| **Breakdown (Q1=D)** | Hybrid Journey + Persona — Epic = Journey del PRD §7; stories dentro = acciones por persona involucrada |
| **Format (Q2=B)** | Job Story: *"Cuando [situación], yo [persona] quiero [motivación], para [resultado]"* |
| **AC (Q3=A)** | Gherkin G/W/T por cada criterio |
| **Granularidad (Q4=D)** | Adaptativa: tool-call-heavy (MH-1, MH-4) → media (sub-stories); config-heavy (MH-3, MH-9, MH-6) → gruesa (1 story = 1 feature) |
| **Persona depth (Q5=B)** | Operacional minimalista: rol + acceso + responsabilidades + dolor + métrica de éxito |
| **Story tags (Q6=A)** | Mínimo: persona + AC. El Epic carga el mapping a Journey/Feature; las stories no duplican esa info. |
| **Scope (Q7=A)** | Solo MUST HAVE (MH-1 a MH-10). Casos 3/4 (Journeys 3, 4 parte returns) → fuera. |

### Epic structure derivada (con los Journeys reales del PRD §7)

Los Journeys del PRD §7 son **4**, no 5. Filtrados al alcance MUST HAVE:

| Epic | Journey PRD §7 | En scope MUST HAVE | MH features cubiertos |
|---|---|---|---|
| **E1 — Order Tracking** | Journey 1 — Mariana consulta su pedido | ✅ Sí | MH-1, MH-2, MH-5, MH-6, MH-7, MH-8 |
| **E2 — Operations & Curation** | Journey 2 — Daniela revisa lunes | ✅ Sí | MH-7, MH-10 (+ visibilidad cross de todos) |
| **E3 — Human Handoff** | Journey 4 — Andrea con queja compleja (solo la parte de handoff) | ✅ Parcial | MH-4 (handoff con paquete de contexto) |
| **E4 — Cross-cutting Setup** | (no es un Journey explícito; agrupa features de configuración) | ✅ Sí | MH-3, MH-9 (A/B Oct8ne) |
| ~~E_descartado~~ Journey 3 — Camilo búsqueda visual | Caso 4 (Could Have / Fase 2-3) | ❌ No | — |
| ~~E_descartado~~ Journey 4 parte returns | Caso 3 (Won't Have MVP) | ❌ No | — |

### Personas en scope (de PRD §9, filtrado al MVP)

- **Cliente final** (Mariana arquetipo Patprimo)
- **Agente humano** (Camila arquetipo Atmos — usada como handoff receiver)
- **Operador / CX Lead** (Daniela)
- **Brand Manager** (Patprimo — único en MVP)
- **Compliance / DPO**
- **Admin / Dev**
- **Sponsor** (CTO + CMO — lectura de dashboards)

---

## Generation Checklist (Part 2 — se ejecutará tras aprobación)

- [x] Generar `aidlc-docs/inception/user-stories/personas.md` con 7 personas en formato operacional minimalista (Q5=B)
- [x] Generar `aidlc-docs/inception/user-stories/stories.md` con 4 Epics (E1–E4) y stories en Job Story format (Q2=B) + AC Gherkin (Q3=A)
- [x] **E1 — Order Tracking**: 6 stories (media granularidad) — saludo+transparencia+consent, identificación dual, tool call `get_order_status`, render respuesta tono Patprimo, guardrails anti-jailbreak, logging del turno
- [x] **E2 — Operations & Curation**: 4 stories (media-gruesa) — dashboard del operador con KPIs, drill-down de escalamientos, alertas, Fase 0 baseline instrumentación
- [x] **E3 — Human Handoff**: 4 stories (media) — detección de triggers, paquete de contexto, transferencia Oct8ne, botón persistente
- [x] **E4 — Cross-cutting Setup**: 2 stories (gruesa) — config voz Patprimo + sign-off Brand Manager (MH-3), A/B Oct8ne con rollback (MH-9)
- [x] **Total final**: 16 stories cubriendo MH-1 a MH-10 (dentro del rango 13-17 esperado)
- [x] Validar INVEST en cada story (sección INVEST Audit en stories.md)
- [x] Validar que cada story tenga acceptance criteria Gherkin explícitos
- [x] Validar que cada story tenga persona asignada
- [x] Auditar coverage: las 10 MH features están cubiertas por al menos 1 story (sección Story Coverage en stories.md)
- [x] Verificar SECURITY compliance summary (N/A en este stage — son diseño + código)
- [x] Actualizar `aidlc-state.md`: User Stories stage complete
- [ ] Presentar completion message con `📋 REVIEW REQUIRED` + `🚀 WHAT'S NEXT`
