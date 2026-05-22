# Requirements Verification Questions — Hermes

> Estas preguntas resuelven los gaps técnicos / de proceso que el PRD (`ai-dlc/prd.md`) deja abiertos, más los opt-ins obligatorios de extensiones de AI-DLC.
> Por favor responde escribiendo la letra elegida después de `[Answer]:` en cada pregunta. Cuando hayas terminado, dime "listo" o "done" y continúo con el siguiente stage.

---

## Intent Analysis Summary (mi lectura del request)

| Dimensión | Valor |
|---|---|
| **Request Clarity** | Clara — el PRD está consolidado (13 segmentos, 88 KB) |
| **Request Type** | New Project (greenfield, codename Hermes) |
| **Scope Estimate** | System-wide — agente conversacional con 8 módulos (M1–M8) |
| **Complexity Estimate** | Complex — multi-marca, RAG + tool use, compliance LATAM, eval framework |
| **Depth seleccionada** | **Comprehensive** — múltiples stakeholders, alto riesgo regulatorio, traceability requerida |

---

## Question 1 — Extension: Security Baseline

¿Se deben aplicar las reglas de la extensión SECURITY como restricciones bloqueantes en este proyecto?

A) Sí — aplicar todas las reglas SECURITY como constraints bloqueantes (recomendado para aplicaciones grado producción)
B) No — saltar todas las reglas SECURITY (apto para PoCs, prototipos y proyectos experimentales)
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

## Question 2 — Extension: Property-Based Testing (PBT)

¿Se deben aplicar reglas de property-based testing en este proyecto?

A) Sí — aplicar todas las reglas PBT como constraints bloqueantes (recomendado para proyectos con lógica de negocio, transformaciones de datos, serialización o componentes con estado)
B) Parcial — aplicar PBT solo a funciones puras y round-trips de serialización (apto para proyectos con complejidad algorítmica limitada)
C) No — saltar todas las reglas PBT (apto para CRUD simple, UI-only, o capas finas de integración sin lógica de negocio significativa)
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

## Question 3 — Alcance de la iteración AI-DLC

El PRD §8 define 10 features Must Have + 5 Should Have + 6 Could Have + 15+ Won't Have. ¿Qué alcance debe atacar **esta** iteración de AI-DLC?

A) Solo MUST HAVE (MH-1 a MH-10) — alineado con el MVP de 4 semanas del PRD
B) MUST HAVE + SHOULD HAVE (MH-1 a MH-10 + SH-1 a SH-5) — MVP + stretch goals
C) MUST HAVE + el Caso 1 funcional end-to-end (MH-1, MH-2, MH-3, MH-4, MH-6, MH-7) — slice vertical más estrecho para llegar a demo rápido
D) Toda la arquitectura del PRD incluyendo Could Have — implementación completa
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

## Question 4 — Stack de implementación (lenguaje + framework)

El PRD no especifica el stack. ¿Qué combinación usamos para el servicio del agente?

A) **Python + FastAPI** — patrón más común con el SDK de Anthropic + AWS Bedrock; rico ecosistema para RAG (langchain, llamaindex, pgvector client)
B) **Python + Flask** — alternativa más liviana, menos opinionada
C) **TypeScript + Node + Fastify/Express** — útil si quieres integrar más naturalmente con el frontend SFCC (también JS)
D) **Otro lenguaje/framework** (Go, Java, etc.)
X) Otro (describir después del tag [Answer]:)

[Answer]: C

---

## Question 5 — Persistencia del estado de conversación

El PRD §M4 dice "Redis o Postgres con TTL". ¿Cuál preferimos?

A) **Redis** — TTL nativo, latencia baja, ideal para conversation state efímero
B) **PostgreSQL** — ya lo usamos para pgvector (RAG); reusar una sola base reduce ops
C) **Postgres para sesión + pgvector para RAG** (misma instancia, mismo stack ops) + Redis opcional Fase 2 si latencia lo exige
D) Aún indeciso — que AI-DLC lo defina en Application Design
X) Otro (describir después del tag [Answer]:)

[Answer]: B

---

## Question 6 — Ubicación del código de Hermes en el repo

¿Dónde vive el código de la aplicación?

A) **Dentro de `ai-dlc/`** — workspace root por convención AI-DLC; código en `ai-dlc/src/` o similar
B) **En la raíz del repo** (`Shopper_Assistant_chatboot/src/` o `Shopper_Assistant_chatboot/hermes/`), con `ai-dlc/` como carpeta de tooling/documentación
C) **Nuevo subfolder dedicado** (ej. `hermes/`) hermano de `ai-dlc/`, `docs/`, `specs/`
X) Otro (describir después del tag [Answer]:)

[Answer]: C

---

## Question 7 — Target de deployment para el MVP

El PRD §M6 fija inferencia en AWS Bedrock LATAM. Para el resto del stack del MVP:

A) **Local-only durante MVP** (Docker Compose: app + Postgres + Redis) — deployment a AWS queda para Fase 2 post-Demo Day
B) **Local-dev + AWS Lambda + RDS** desde el MVP — más cerca de prod, más complejidad operativa
C) **Local-dev + AWS ECS Fargate + RDS** — contenedor en lugar de Lambda
D) Aún indeciso — que AI-DLC lo defina en Infrastructure Design
X) Otro (describir después del tag [Answer]:)

[Answer]: A

---

## Question 8 — Unidades de trabajo (Units Generation)

El PRD define 8 módulos (M1–M8). Para AI-DLC, una "unidad" corresponde a un paquete cohesivo de funcionalidad. ¿Cómo agrupamos?

A) **1 unidad por módulo** (8 unidades) — máxima granularidad, mayor overhead de stages
B) **Agrupar por capa funcional**: Frontline (M1, M4, M5) / Data (M2, M3) / Control (M6, M7, M8) → 3 unidades
C) **Agrupar por dependencia y caso de uso**: Core agente (M1+M3+M4+M6+M7 — soporta Caso 1) → Knowledge (M2) → Multi-marca/Operator (M5+M8) → 3 unidades centradas en MVP value delivery
D) Una sola unidad monolítica al inicio, refactorizar después
X) Otro (describir después del tag [Answer]:)

[Answer]: C

---

> Cuando termines de responder, escribe **"listo"** y continúo con el siguiente paso de Requirements Analysis (validación de respuestas + generación del documento de requirements oficial).
