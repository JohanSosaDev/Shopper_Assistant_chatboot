# Unit of Work — Hermes

> **Decomposition strategy**: 3 unidades por dependencia + caso de uso (Q8 de Requirements + Q1 de Units Generation = A confirmar).
> **Deployment model**: Greenfield monolithic single-tenant. **No** son micro-services — todas las unidades viven en el mismo proceso Node y el mismo `package.json`.
> **Terminología**: "Unidad de trabajo" = paquete cohesivo de stories que se diseñan + codifican + entregan secuencialmente.

---

## Unit 1 — Core Agente

### Definition
La columna vertebral del MVP: entrega el **Caso 1 (estado de pedido) end-to-end** con compliance baseline y logging auditable. Es la primera y única unidad necesaria para una demo funcional del happy path.

### Modules owned
- M1 — Conversation (orquestador del turno)
- M3 — SFCC Integrations (`get_order_status`)
- M4 — Identity & Session (auth dual + conversation state)
- M6 — Compliance (PII anonymization, consent gate, retention)
- M7 — Observability **(write-path)** — logger por turno + Fase 0 baseline
- CC-1 — Composition root (`app.ts`)
- CC-2 — Global error handler
- CC-3 — Request context
- CC-4 — Migrations
- `lib/` (utilities cross-cutting: hashing, retry, circuit-breaker, PII detection)
- `models/` (Zod schemas + TS types compartidos)

### Stories owned
- E1-S1 — Saludo + transparencia + autorización
- E1-S2 — Identificación dual SFCC + guest
- E1-S3 — Tool call `get_order_status`
- E1-S4 — Respuesta voz Patprimo *(con seed hard-coded — el CRUD de brand config va a Unit 2)*
- E1-S5 — Guardrails anti-jailbreak
- E1-S6 — Logging completo (write-path)
- E2-S4 — Fase 0 instrumentación baseline

**Story count: 7**

### Deliverables
- Postgres con migrations base: `conversations`, `turns`, `turn_log_audit`, `consent_log`, `sessions`, `brand_configs_seed`
- Fastify app con plugins M1+M3+M4+M6+M7
- Endpoint `POST /chat` operativo (Caso 1 end-to-end)
- Endpoint `GET /health` + `GET /health/ready`
- LoggerService escribiendo a Postgres con esquema completo de turno
- Bedrock client funcional (`@anthropic-ai/bedrock-sdk` apuntando a región LATAM)
- SFCC tool registry con `get_order_status` implementado
- Guardrails básicos (regex + heurísticas para prompt injection)
- Suite de tests: unit + integration de Caso 1
- Docker Compose levantando app + Postgres
- Bootstrap brand_config seed (Patprimo, hard-coded para no bloquear Unit 1)

### Definition of Done
- Demo del Caso 1: cliente Mariana abre chat → saludo+consent → da # orden + email → bot consulta SFCC mock o real → respuesta en voz Patprimo → logging completo persistido.
- Latencia p50 <30 seg verificada en test local.
- Las 7 stories tienen tests pasando contra sus AC Gherkin.
- Las SECURITY rules aplicables (SECURITY-01, 03, 05, 08, 11, 15) compliant.

---

## Unit 2 — Knowledge & Brand Voice

### Definition
**Brand config CRUD end-to-end** con sign-off auditable del Brand Manager (story E4-S1 gruesa). El módulo M2 (Knowledge RAG) queda como **stub** en MVP — no se construye ingest pipeline ni búsqueda semántica. Esto formaliza la separación entre "config bootstrap" (Unit 1, hard-coded) y "config gestionada" (Unit 2, CRUD + versioning + sign-off).

### Modules owned
- M2 — Knowledge Base (stub mínimo: tabla pgvector creada, service returns [])
- M8 — Brand Configuration **(CRUD parte)** — versiones, sign-off, activate, rollback. **No** A/B routing aún (eso va a Unit 3).

### Modules extended
- `models/` — agrega tipos `BrandConfig`, `BrandConfigVersion`, `BrandConfigDraft`, `ApproverIdentity` *(propone via PR review per Q3=C)*

### Stories owned
- E4-S1 — Voz Patprimo + sign-off Brand Manager *(gruesa — incluye CRUD + versioning + sign-off auditable + activación + rollback granular + muestra semanal)*

**Story count: 1 (gruesa, cubre toda la feature MH-3 end-to-end)**

### Deliverables
- Migrations adicionales: `brand_config_versions`, `brand_config_signoffs`
- Service `BrandConfigService` reemplaza el seed bootstrap de Unit 1
- Endpoints admin: `GET/POST/PUT /admin/brands/:brand/configs`, sign-off action, activate action, rollback action
- Brand Manager interface (REST + minimal UI o JSON-only para MVP)
- Reemplazo del seed Patprimo de Unit 1 por config en DB
- Integración con M1 ConversationService — `getActive(brand)` reemplaza el lookup hard-coded
- Tests: CRUD + sign-off + activate/rollback flows

### Definition of Done
- Patprimo system prompt + few-shot v1 en DB con sign-off auditable simulando Brand Manager.
- Activación de v1 en runtime — M1 lo consume sin re-deploy.
- Rollback granular: cambio v1→v2→v1 en <1h verificado en test.
- Veto scenario de E1-S4 ahora viable end-to-end (cuando Brand Manager rechaza una versión, el deploy/activate falla).

---

## Unit 3 — Handoff & Convivencia (+ Operations Dashboards)

### Definition
Cierra el loop del MVP: **handoff de primera clase** con notificación email/teléfono al equipo CX (stub MVP) + **despliegue gradual con kill switch** (RolloutGate) + **dashboards operacionales** para el operador (read-path de M7). Sin esta unidad no hay deploy a producción seguro. Sustituye el plan original "handoff a widget Oct8ne + A/B vs Oct8ne" tras validación 2026-05-25 (Oct8ne no atiende chat — solo batch outbound manual).

### Modules owned
- M5 — Human Handoff (pipeline `TriggerDetector → PackageBuilder → DeliveryAdapter` con nodemailer + mailhog en dev; SMTP real Fase 2)
- M8 — RolloutGate (kill switch + traffic % via `system_config`) *(complementa el CRUD de Unit 2)*
- M7 — Observability **(read-path)** — dashboards, drill-down, alertas

### Modules extended
- M3 — SFCC: agrega `getOrderHistory(customerIdHash)` para el paquete de contexto del handoff
- M6 — Compliance: agrega flujo de PII anonymization específico para handoff log

### Stories owned
- E2-S1 — Dashboard del operador con KPIs principales
- E2-S2 — Drill-down de escalamientos
- E2-S3 — Alertas configurables
- E3-S1 — Detección automática de triggers de handoff
- E3-S2 — Construcción del paquete de contexto al escalar
- E3-S3 — Transferencia operativa al equipo CX vía notificación email/teléfono
- E3-S4 — Botón "Hablar con persona" persistente
- E4-S2 — Despliegue gradual de Hermes con kill switch (auto-rollback por degradación = Fase 2)

**Story count: 8**

### Deliverables
- Migrations: `handoff_tickets`, `system_config` (con `rollout_salt`, `hermes_enabled`, `hermes_traffic_percentage`, `handoff_stub_message`), `system_config_audit`, `alert_rules`, `escalation_index`
- Service `HandoffService` con pipeline `TriggerDetector → PackageBuilder → DeliveryAdapter` (DeliveryAdapter usa nodemailer + mailhog en dev; SMTP real Fase 2)
- Service `RolloutGate` con `shouldServeHermes(identifier): boolean` stateless (hash SHA-256 + `rollout_salt` + bucket vs `hermes_traffic_percentage`). *Auto-rollback por degradación de KPI = Fase 2 per Unit 3 NFR-R; MVP requiere acción manual del operador alertado vía Slack.*
- Service `DashboardService` con queries para KPI snapshot, escalation list, conversation view
- Service `AlertingService` con rule registry + scheduled evaluator
- Endpoint público `GET /widget/config` (consumido por widget SFCC al cargar; RolloutGate decide servir Hermes o fallback humano-en-horario)
- Endpoints admin: `/admin/dashboard/kpis`, `/admin/dashboard/escalations`, `/admin/alerts/rules`, `/admin/rollout/config`, `PATCH /admin/rollout/traffic-percentage`, `PATCH /admin/rollout/kill-switch`, `/admin/handoff-tickets`
- Email service integration (nodemailer + mailhog en dev) para notificación al equipo CX; sin integración con widget de terceros en MVP (WhatsApp Business y/o Salesforce Service Cloud planificados para Fase 2)
- Tests: handoff e2e + RolloutGate PBT (determinismo, monotonía, kill switch absoluto) + dashboard queries

### Definition of Done
- Cliente con sentimiento negativo o request explícito → notificación al equipo CX vía email/teléfono con paquete contexto completo, <60 seg.
- RolloutGate determinístico por `sessionId` con split configurable + kill switch operable en <1 min via `PATCH /admin/rollout/kill-switch`. *Auto-rollback por degradación = Fase 2; MVP requiere operador alertado.*
- Dashboard operador renderiza los 6 KPIs primarios + drill-down a conversaciones individuales.
- Las 8 stories tienen tests pasando contra sus AC Gherkin.
- SLA del canal humano fallback (atención en horario) preservado durante operación gradual rollout (no-regression). *Oct8ne no atiende chat — solo batch outbound, canal independiente.*

---

## Code Organization Strategy (Greenfield)

Per Q2=A + Q3=C:

```text
hermes/src/
├── app.ts                    # CC-1 — propiedad de Unit 1
├── server.ts                 # Unit 1
├── config/                   # Unit 1
├── plugins/
│   ├── m1-conversation.plugin.ts        # Unit 1
│   ├── m2-knowledge.plugin.ts           # Unit 2 (stub)
│   ├── m3-sfcc.plugin.ts                # Unit 1 (creación) + Unit 3 (extensión)
│   ├── m4-session.plugin.ts             # Unit 1
│   ├── m5-handoff.plugin.ts             # Unit 3
│   ├── m6-compliance.plugin.ts          # Unit 1 (creación) + Unit 3 (handoff PII)
│   ├── m7-observability.plugin.ts       # Unit 1 (write) + Unit 3 (read/dashboards)
│   ├── m8-brand-config.plugin.ts        # Unit 2 (CRUD)
│   ├── m8-rollout.plugin.ts             # Unit 3 (RolloutGate + kill switch + traffic %)
│   ├── postgres.plugin.ts               # Unit 1
│   ├── bedrock.plugin.ts                # Unit 1
│   ├── error-handler.plugin.ts          # Unit 1
│   └── request-context.plugin.ts        # Unit 1
├── controllers/              # Cada unit agrega sus controllers
├── services/                 # Cada unit agrega sus services (per-module)
├── repositories/             # Cada unit agrega sus repos
├── models/                   # ⚠️ Unit 1 ownership — Units 2/3 proponen extensiones via PR
├── tools/                    # Unit 1 base + Unit 3 extensiones (orderHistory)
├── prompts/                  # Unit 2 owns esto (Patprimo)
├── guardrails/               # Unit 1
├── lib/                      # ⚠️ Unit 1 ownership — Units 2/3 consumen
└── jobs/
    ├── session-cleanup.job.ts         # Unit 1
    ├── retention.job.ts               # Unit 1
    └── alert-evaluator.job.ts         # Unit 3 (auto-rollback por KPI = Fase 2; MVP usa alerting + acción manual)

hermes/migrations/
├── 0001_unit1_base.sql                # Unit 1
├── 0002_unit2_brand_config.sql        # Unit 2
└── 0003_unit3_handoff_rollout.sql    # Unit 3
```

### Ownership rules (per Q2=A, Q3=C)
- **Unit 1 es dueño de `lib/`**. Unit 2 y Unit 3 lo consumen libremente, no agregan archivos directamente. Si Unit 2/3 necesitan una utility nueva, proponen el cambio en PR review con Unit 1.
- **Unit 1 es dueño de `models/`**. Unit 2 y Unit 3 proponen extensiones via PR review (Q3=C). Esto previene drift de tipos compartidos y forza una conversación cross-unit antes de que un model se ramifique.
- **Plugins son shared** — cada unit puede crear nuevos o extender existentes (con coordinación si es extensión).
- **Controllers, services, repositories son por-feature** — cada unit agrega los suyos sin tocar los de otra unit (salvo extensiones explícitas como M3 `getOrderHistory` en Unit 3).

---

## Security Compliance Summary

| Rule | Status | Notas |
|---|---|---|
| SECURITY-11 (secure design) | Aplicado | Decomposición separa preocupaciones: M6 Compliance es de Unit 1; M5 Handoff de Unit 3; sin coupling entre security-critical logic y handoff logic |
| Otros SECURITY rules | N/A en este stage | Evaluados en NFR Design + Code Generation per unit |

*No hay findings bloqueantes en este stage.*
