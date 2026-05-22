# Application Design Plan — Hermes

## Plan Overview

Application Design produce el diseño **high-level** de los 8 módulos (M1–M8 del PRD §9) sobre el stack ya confirmado (TS + Node + Fastify + Postgres + pgvector + Bedrock). El detalle de business logic se difiere a Functional Design (per-unit, Construction phase).

**Input artifacts:**
- `requirements.md` §5 (10 MUST HAVE features), §7 (stack), §8 (3 units), §9 (Open Decisions OD-1 a OD-8)
- `stories.md` (16 stories con AC Gherkin)
- `personas.md` (7 personas)
- PRD §9 (módulos M1–M8: features, roles, screens, principios)

**Depth**: **Standard** (per execution plan)

---

## Embedded Questions (responde llenando `[Answer]:`)

### Question 1 — Estilo arquitectónico Fastify

¿Cómo estructuramos el servicio Fastify?

A) **Single monolithic Fastify app con plugin modules** — un solo proceso Node; cada módulo M1–M8 es un Fastify plugin registrado. Simple para MVP local-only Docker Compose.
B) **Layered MVC** — controllers/services/repositories como capas; los módulos no se reflejan como plugins sino como agrupaciones de servicios.
C) **Modular monolith con bounded contexts** — un proceso, pero cada módulo M1–M8 es un módulo TS auto-contenido con su propia API pública (interfaces) + tests + sin imports cruzados directos.
D) **Micro-services desde día 1** — un servicio por módulo. Más complejo pero más fiel al diagrama PRD §9.
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

### Question 2 — Patrón de service wiring / dependency injection

¿Cómo conectamos las dependencias entre módulos?

A) **Manual constructor wiring** — sin framework de DI; un `composition root` (ej. `app.ts`) instancia y conecta todo a mano. Mínimo overhead, explícito.
B) **DI container ligero (Awilix o tsyringe)** — registro de dependencias + resolución automática; útil cuando hay muchas interfaces cross-module.
C) **NestJS-style framework DI** — adoptar NestJS sobre Fastify (en lugar de Fastify standalone) para tener DI + modules + decorators integrados.
D) **Fastify decorators (`fastify.decorate`)** — usar el sistema nativo de Fastify para inyectar servicios al request context.
X) Otro (describir después del tag [Answer]:)

[Answer]: D

---

### Question 3 — Data access pattern / ORM

Para acceder a Postgres (sessions, turns, brand_configs, consent_log, ab_assignments, pgvector embeddings):

A) **Prisma** — ORM moderno con schema-first, type-safety end-to-end, migrations excelentes; soporte pgvector aceptable vía SQL bruto en algunos casos. Más opinionado.
B) **Drizzle ORM** — TypeScript-first, schema-as-code, queries con tipo seguro, bajo overhead, soporte nativo pgvector mejor que Prisma.
C) **Kysely** — query builder type-safe (no ORM); migrations manuales pero queries SQL casi puras con TS types.
D) **`pg` driver crudo + manual SQL** — máximo control, mínima abstracción; obliga a manejar migrations, types y query building manualmente.
X) Otro (describir después del tag [Answer]:)

[Answer]: D

---

### Question 4 — Cliente LLM para Bedrock

¿Cómo invocamos Claude Haiku 4.5 vía AWS Bedrock LATAM?

A) **AWS SDK v3 — `@aws-sdk/client-bedrock-runtime`** — invocación directa con `InvokeModelCommand` o `ConverseCommand`; máximo control sobre auth, retry, streaming; ningún wrapper opinionado.
B) **Anthropic SDK con Bedrock support — `@anthropic-ai/bedrock-sdk`** — API similar al SDK de Anthropic directo, transparente sobre Bedrock; bueno para portabilidad si en Fase 2 se considera Anthropic directo.
C) **LangChain JS** — abstrae el LLM provider; conveniente para experimentar con RAG/chains; agrega dependencias pesadas y un nivel de abstracción extra.
X) Otro (describir después del tag [Answer]:)

[Answer]: B

---

### Question 5 — Validación de input

¿Qué biblioteca usamos para validar inputs de API y schemas internos (alineado con SECURITY-05 input validation)?

A) **Zod** — TS-first, runtime + compile-time types, integración nativa con Fastify via `@fastify/zod-validator` o `fastify-type-provider-zod`. Estándar de facto en TS moderno.
B) **TypeBox** — JSON Schema-first, validación rápida vía Ajv bajo el hood, integración Fastify oficial (`@fastify/type-provider-typebox`).
C) **Yup** — popular pero menos optimizado para TypeScript que Zod/TypeBox.
D) **Ajv directo** — JSON Schema crudo, máxima performance, menor ergonomía.
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

### Question 6 — Project structure dentro de `hermes/`

¿Single package o workspace?

A) **Single package** — un solo `package.json`, todo el código en `hermes/src/` con folders por módulo. Más simple, suficiente para MVP.
B) **pnpm workspace monorepo** — múltiples packages internos (ej. `@hermes/core`, `@hermes/sfcc-tools`, `@hermes/shared-types`); útil si en Fase 2 se publican algunos como librerías separadas.
C) **Turborepo + pnpm workspaces** — monorepo con build orchestration; sobre-engineering para MVP de 4 semanas, sí útil si crece a multi-marca/multi-país.
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

### Question 7 — Organización de carpetas dentro del código

¿Qué estilo de organización aplicamos dentro de `hermes/src/`?

A) **Layered (capas)** — `controllers/`, `services/`, `repositories/`, `models/`. Familiar para devs con background MVC.
B) **Feature/Module-based** — un folder por módulo (`modules/m1-conversation/`, `modules/m2-knowledge/`, etc.) con sub-folders internos (controllers, services, etc.). Alinea 1:1 con PRD §9 y con la decomposición en 3 Units.
C) **Domain-Driven Design (DDD) light** — bounded contexts como folders top-level (`domains/customer/`, `domains/conversation/`, `domains/handoff/`), cada uno con su propia capa interna.
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

> Cuando termines de responder, escribe **"listo"** y procedo a (a) validar respuestas, (b) generar los 5 artefactos de Application Design.

---

## Application Design Checklist (a ejecutar tras respuestas + aprobación implícita)

- [ ] Validar respuestas Q1–Q7; analizar ambigüedades; pedir follow-ups si aplica
- [ ] Generar `aidlc-docs/inception/application-design/components.md` — componentes M1–M8 con propósito, responsabilidades e interfaces TS
- [ ] Generar `aidlc-docs/inception/application-design/component-methods.md` — method signatures por componente, input/output types, sin business logic detallada
- [ ] Generar `aidlc-docs/inception/application-design/services.md` — service layer (orquestador conversacional, tool dispatcher, handoff coordinator, etc.) con patrón de orquestación
- [ ] Generar `aidlc-docs/inception/application-design/component-dependency.md` — matriz de dependencias + comunicación + data flow Mermaid
- [ ] Generar `aidlc-docs/inception/application-design/application-design.md` — consolidado de los 4 docs anteriores
- [ ] Validar consistencia (no contradicciones, no gaps)
- [ ] Security compliance summary (esperado: SECURITY-05, SECURITY-08, SECURITY-11, SECURITY-15 aplican; otros N/A por ser pre-código)
- [ ] Actualizar `aidlc-state.md`: Application Design complete
- [ ] Presentar completion message con `📋 REVIEW REQUIRED` + `🚀 WHAT'S NEXT`
