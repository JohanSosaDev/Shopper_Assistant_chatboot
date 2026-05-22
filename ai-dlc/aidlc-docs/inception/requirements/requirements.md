# Requirements Document — Hermes

**Project**: Hermes — Agente Conversacional de IA para grupo PASH SAS
**Stage**: Inception / Requirements Analysis (Comprehensive depth)
**Date**: 2026-05-20
**Author**: AI-DLC workflow (validated by Johan Sosa)
**Input artifacts**: `ai-dlc/prd.md` (PRD consolidado, 13 segmentos), respuestas a `requirement-verification-questions.md`

---

## 1. Intent Analysis Summary

| Dimensión | Valor |
|---|---|
| **User request** | "Usando AI-DLC, construiremos un producto que consiste en Hermes, un agente conversacional de IA para atención al cliente del grupo PASH (Patprimo, Seven Seven, Ostu, Atmos) sobre Salesforce Commerce Cloud, con personalidad propia por marca, datos transaccionales en tiempo real y cobertura 24/7. Con base en el PRD @prd.md" |
| **Request type** | New Project (greenfield) |
| **Scope estimate** | System-wide — 8 módulos M1–M8, MVP de 10 features MUST HAVE |
| **Complexity** | Complex — multi-marca, RAG + tool use, compliance LATAM, eval framework |
| **Depth seleccionada** | Comprehensive |

---

## 2. Project Context (de PRD §1–§3)

- **Producto**: agente conversacional de IA que atiende clientes del grupo PASH sobre Salesforce Commerce Cloud, con personalidad propia por marca, datos transaccionales en tiempo real y cobertura 24/7.
- **Empresa**: PASH SAS (Colombia) — Patprimo, Seven Seven, Ostu, Atmos.
- **Demo Day**: 2026-06-09.
- **MVP scope** (PRD §8 + Q3): Patprimo Colombia, chat web, **2 escenarios** (Estado de pedido + Disponibilidad). Esta iteración AI-DLC ataca **solo MUST HAVE (MH-1 a MH-10)**.
- **Stakeholders** (PRD §9 Mapa de roles): Cliente final · Agente humano · Operador/CX Lead · Brand Manager · Compliance/DPO · Admin/Dev · Sponsor (CTO + CMO).

---

## 3. User Answers Summary (de `requirement-verification-questions.md`)

| # | Pregunta | Respuesta |
|---|---|---|
| Q1 | Security Baseline extension | **A — Enable** (blocking constraints) |
| Q2 | Property-Based Testing extension | **A — Enable** (blocking constraints) |
| Q3 | Alcance de la iteración | **A — Solo MUST HAVE** (MH-1 a MH-10) |
| Q4 | Stack | **C — TypeScript + Node + Fastify/Express** |
| Q5 | Persistencia conversación | **B — PostgreSQL** (única instancia, también para pgvector) |
| Q6 | Ubicación del código | **C — Nuevo subfolder dedicado** (`hermes/`) hermano de `ai-dlc/`, `docs/`, `specs/` |
| Q7 | Deployment MVP | **A — Local-only Docker Compose** (deployment AWS → Fase 2) |
| Q8 | Decomposición en unidades | **C — 3 unidades por dependencia/use-case** (Core agente / Knowledge / Multi-marca-Operator) |

---

## 4. Extension Configuration

| Extensión | Enabled | Alcance |
|---|---|---|
| **Security Baseline** | ✅ Sí | 15 reglas SECURITY-01 a SECURITY-15 como blocking constraints |
| **Property-Based Testing** | ✅ Sí | Aplicar PBT a lógica de negocio, transformaciones de datos, serialización y componentes con estado |

> **Nota**: Hermes maneja PII (Habeas Data Col Ley 1581 + Circular SIC 002/2024), datos transaccionales y conversaciones — activar SECURITY como blocking es coherente con el riesgo legal documentado en PRD §6 P4 y §12. PBT también se justifica fuerte por la lógica de orquestación M1, validación de tools M3 y serialización de paquetes de handoff M5.

---

## 5. Functional Requirements

### 5.1 Alcance MUST HAVE de esta iteración (de PRD §8)

Los 10 features Must Have del PRD están dentro del alcance de esta iteración AI-DLC. **Should Have, Could Have y Won't Have quedan fuera** (Fase 2+).

| ID | Feature | Módulos PRD §9 |
|---|---|---|
| MH-1 | Caso 1 funcional — consulta estado de pedido con tool `get_order_status` | M1 + M3 + M4 + M7 |
| MH-2 | Identificación dual — auth via SFCC session + flujo guest-friendly | M4 |
| MH-3 | Per-brand voice de Patprimo — system prompt + 10–20 ejemplos validados | M1 + M8 |
| MH-4 | Handoff a humano de primera clase — botón visible + triggers + paquete de contexto | M5 + M3 |
| MH-5 | Compliance baseline operativo — Bedrock LATAM + DPA + autorización expresa + PII anonymization | M6 |
| MH-6 | Transparencia "soy IA" — saludo identificado + indicador visual permanente | M1 + M6 |
| MH-7 | Logs auditables — turno con timestamp, hash, intención, tools, latencia, tokens, output, sentimiento | M7 |
| MH-8 | Guardrails anti-jailbreak — system prompt hardened + validador regex + red team previo | M1 |
| MH-9 | Convivencia con Oct8ne en A/B — división de tráfico + rollback automático | M5 + M7 |
| MH-10 | Fase 0 instrumentación pre-launch — baseline real de KPIs + CSAT/NPS + dashboard | M7 + M10 (instrumentación) |

> **Trade-off TO-1 (PRD §8):** Caso 2 (disponibilidad + add-to-cart) — Should Have, fuera del alcance MUST HAVE de esta iteración. Si IT entrega OCAPI Inventory en semana 1, puede promoverse en una iteración futura.

### 5.2 Casos de uso end-to-end soportados por esta iteración

| Caso | PRD | En alcance |
|---|---|---|
| Caso 1 — Estado de pedido | §5 + §7 | ✅ Sí (Caso 1 = MH-1) |
| Caso 5 — Escalamiento a humano (transversal) | §5 + §7 | ✅ Sí (MH-4) |
| Caso 2 — Disponibilidad | §5 + §7 | ❌ No (Stretch / Fase 2) |
| Caso 3 — Devolución | §5 + §7 | ❌ No (Won't Have del MVP) |
| Caso 4 — Búsqueda asistida | §5 + §7 | ❌ No (Could Have / Fase 2-3) |

### 5.3 User journeys de referencia

Los user journeys detallados están en PRD §7. Para esta iteración son normativos:
- Journey 1 — Cliente con consulta de pedido (happy path) → MH-1.
- Journey 2 — Cliente que escala a humano → MH-4.
- Journey 3 — Brand Manager revisa y aprueba personalidad → MH-3.
- Journey 4 — Operador audita conversaciones → MH-7.
- Journey 5 — Compliance/DPO solicita auditoría → MH-5 + MH-7.

---

## 6. Non-Functional Requirements

### 6.1 De PRD §6 — Principios de Diseño No Negociables

| P# | Principio | NFR |
|---|---|---|
| P1 | **Datos en vivo siempre** | Tool calls a SFCC OCAPI/SCAPI en runtime; cero respuestas inventadas |
| P2 | **Handoff humano de primera clase** | Botón persistente + triggers automatizados + paquete de contexto rico |
| P3 | **Una plataforma, N personalidades** | Configuración por marca aislada; sin homogeneización cross-marca |
| P4 | **Compliance baseline desde día 1** | Bedrock LATAM + DPA Anthropic + autorización expresa + PII anonymization + retención por país |
| P5 | **Transparencia radical** | Saludo "soy IA" + indicador visual permanente |
| P6 | **Métricas o no existe** | Cada turno instrumentado; dashboard del operador es prerequisito de operación |
| P7 | **Logs auditables completos** | Append-only, retención mínima 90 días, no eliminables por la app (SECURITY-14) |

### 6.2 De PRD §10 — Métricas de éxito (targets)

| KPI | Target MVP | Target Mes 12 |
|---|---|---|
| Tiempo 1ª respuesta | <30 seg p50 | <30 seg p50 |
| TRU (Tasa Resolución Útil) | ≥40% | ≥75% |
| Conversación → conversión chat | ≥40% (Patprimo) | ≥60% (cross-marca) |
| CSAT post-conversación | ≥4.0/5 baseline | ≥4.5/5 |
| Costo unitario por consulta | ≤COP $2.500 (year 1 mix) | ≤COP $1.500 |

### 6.3 Performance

- Latencia p50 < 30 seg fin-a-fin (incluye LLM + tool call SFCC + render).
- Latencia p95 < 60 seg.
- Concurrencia objetivo MVP: 50 conversaciones simultáneas (Patprimo Col, día pico estimado).

### 6.4 Reliability

- Uptime objetivo MVP: 99% (cobertura 24/7).
- Failover/rollback automático al chat humano si el bot supera umbral de error.
- Pruebas de carga antes de Demo Day.

### 6.5 Compliance — derivado de PRD §6 P4 + §12

- **Ley 1581 Col + Estatuto del Consumidor + Circular SIC 002/2024 + CONPES 4144**.
- Inferencia regional (AWS Bedrock LATAM); DPA con Anthropic firmado.
- Autorización expresa antes de procesar PII; consent log auditable.
- Derecho al olvido (data deletion request) operativo.
- Retención por país y categoría de dato.

### 6.6 Security — Extension Security Baseline activa

Aplican las 15 reglas SECURITY-01 a SECURITY-15 como **blocking constraints**. Las relevantes inmediatas para esta arquitectura:

| Rule | Aplicación a Hermes |
|---|---|
| SECURITY-01 | Postgres con encryption at rest + TLS in transit |
| SECURITY-03 | Logging estructurado en todos los handlers (Fastify hooks o middleware) |
| SECURITY-05 | Validación de input en TODOS los endpoints API (Zod o equivalente) |
| SECURITY-08 | Authorization en cada endpoint; CORS restrictivo; JWT validation server-side |
| SECURITY-10 | Lock file (`package-lock.json` o `pnpm-lock.yaml`), scanner de vulnerabilidades en CI |
| SECURITY-11 | Rate limiting en el endpoint público del chat; módulos dedicados a auth/compliance |
| SECURITY-12 | Sin credenciales en código; secret manager (env vars + .env.example sin secrets) |
| SECURITY-14 | Retención 90 días+; logs append-only; alerts en auth/authz failures |
| SECURITY-15 | Global error handler; fail-closed; manejo explícito de errores en tool calls |

### 6.7 Testability — Extension PBT activa

- PBT obligatoria en: orquestador M1 (decisión de tool), validadores M3 (parámetros de tools), serializadores M5 (paquete handoff), anonymizer M6 (PII).
- Suite de eval del agente (PRD §11) integrada al flujo CI.

### 6.8 Maintainability

- Arquitectura modular alineada con los 8 módulos M1–M8 del PRD §9.
- Configuración por marca como artefacto versionado (PRD M8).
- Documentación inline mínima (default: WHY only).

---

## 7. Technical Stack y Constraints

### 7.1 Stack confirmado (Q4 + Q5)

| Capa | Tecnología | Fuente |
|---|---|---|
| Lenguaje | TypeScript | Q4 = C |
| Runtime | Node.js LTS (≥20) | Q4 = C |
| Web framework | **Fastify por defecto**; Express aceptable — confirmar en Application Design | Q4 = C (ambiguo) |
| LLM | Claude Haiku 4.5 vía AWS Bedrock LATAM | PRD §6 P4 + §1 resumen ejecutivo |
| SDK LLM | Anthropic SDK + Bedrock client (`@anthropic-ai/bedrock-sdk` o invocación AWS SDK directa) | A confirmar en Application Design |
| Persistencia | PostgreSQL única (sesión + RAG vía pgvector) | Q5 = B |
| Vector DB | pgvector (extensión Postgres) | PRD §M2 + Q5 = B |
| Container runtime | Docker / Docker Compose | Q7 = A |
| Deployment MVP | Local-only Docker Compose (app + Postgres) | Q7 = A |
| Deployment Fase 2+ | AWS (a definir: Lambda vs ECS Fargate) | PRD + Q7 = A |
| CI/CD MVP | GitHub Actions (a confirmar) | A confirmar |

### 7.2 Constraints

- **Compliance**: inferencia regional Bedrock LATAM obligatoria (no us-east-1, no eu-west-1).
- **Convivencia Oct8ne**: A/B con rollback automático; no reemplazo.
- **PRD §6 P3**: aislamiento de configuración por marca aun cuando MVP solo usa Patprimo.
- **Workspace layout (Q6 = C)**: el código vive en `hermes/` (hermano de `ai-dlc/`), no dentro de `ai-dlc/`.

### 7.3 Workspace layout propuesto

```text
Shopper_Assistant_chatboot/
├── ai-dlc/                  # AI-DLC tooling + PRD + docs (workspace AI-DLC)
│   ├── CLAUDE.md
│   ├── prd.md
│   ├── .aidlc-rule-details/
│   └── aidlc-docs/          # Documentación AI-DLC (artefactos por stage)
├── hermes/                  # ⚠️ Código de la aplicación (Q6 = C)
│   ├── src/
│   ├── tests/
│   ├── docker-compose.yml
│   ├── package.json
│   └── tsconfig.json
├── docs/                    # Brief, ICP, deep research
├── specs/                   # PRD copia + futuras specs
└── README.md
```

> **Nota AI-DLC workspace root**: AI-DLC ejecuta desde `ai-dlc/` (por `CLAUDE.md`), pero el código de Hermes vive en `hermes/`. Las rutas de generación de código (en stages de Construction) apuntarán a `hermes/`, no a `ai-dlc/`.

---

## 8. Decomposición en Unidades de Trabajo (Q8 = C)

Esta iteración define 3 unidades. Dado que el alcance es **MUST HAVE únicamente**, las 3 unidades no se implementan todas con la misma profundidad — la Unidad 1 entrega valor end-to-end del MVP.

| # | Unidad | Módulos PRD | Features MUST HAVE | Estado en esta iteración |
|---|---|---|---|---|
| 1 | **Core Agente** — soporta Caso 1 end-to-end | M1 + M3 + M4 + M6 + M7 | MH-1, MH-2, MH-5, MH-6, MH-7, MH-8, MH-10 | **Implementación completa** |
| 2 | **Knowledge & Brand Voice** | M2 + M8 (partial) | MH-3 (config Patprimo, sin RAG denso) | **Implementación parcial** — solo config por marca, sin RAG denso (no requerido para Caso 1) |
| 3 | **Handoff & Convivencia** | M5 + M8 + M9 (instrumentación A/B) | MH-4, MH-9 | **Implementación completa** |

> **Justificación del orden**: Unit 1 entrega MVP funcional sin depender de las otras. Unit 2 carga la voz de Patprimo (necesaria para experiencia de marca). Unit 3 cierra el loop con handoff y A/B vs Oct8ne (sin esto, MVP no es deployable a producción).

---

## 9. Open Decisions — a resolver en stages siguientes

| # | Decisión | Stage donde se resuelve |
|---|---|---|
| OD-1 | Fastify vs Express | Application Design |
| OD-2 | Estrategia de migración Postgres (Prisma, Drizzle, Kysely, plain SQL) | Functional Design Unit 1 |
| OD-3 | SDK exacto para Bedrock (Anthropic SDK vs AWS SDK directo) | Application Design |
| OD-4 | Bibliotecas de validación de input (Zod, Yup, Ajv) | Application Design |
| OD-5 | Frontend del widget chat (embed-only? React component? Vanilla?) | Application Design |
| OD-6 | Estructura específica de tests (Vitest? Jest? Playwright para e2e?) | NFR Design |
| OD-7 | Estrategia de A/B con Oct8ne (proxy a nivel de widget? feature flag?) | Functional Design Unit 3 |
| OD-8 | CI/CD pipeline detalle (GitHub Actions workflows específicos) | Build and Test |

---

## 10. Summary

- **Producto**: Hermes — agente conversacional de IA, multi-marca PASH, sobre SFCC.
- **Alcance esta iteración**: MUST HAVE únicamente (MH-1 a MH-10), centrado en Caso 1 (estado de pedido) + Caso 5 (escalamiento).
- **Stack**: TypeScript + Node + Fastify (default) + Postgres con pgvector + Bedrock LATAM (Haiku 4.5).
- **Workspace**: código en `hermes/`, docs AI-DLC en `ai-dlc/aidlc-docs/`.
- **Extensiones activas**: Security Baseline + Property-Based Testing (ambas como blocking).
- **Decomposición**: 3 unidades, Unit 1 (Core Agente) es el value delivery del MVP.
- **Demo Day**: 2026-06-09 → 21 días desde hoy.

---

## 11. Security Compliance Summary (Stage = Requirements Analysis)

| Rule | Status | Notas |
|---|---|---|
| SECURITY-01 → SECURITY-15 | **N/A en este stage** | Requirements no produce código ni infra desplegable. Reglas se evalúan a partir de Application Design / Functional Design. |

*No hay findings bloqueantes en este stage.*
