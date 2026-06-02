# Services & Orchestration — Hermes

> **Scope**: Patrones de orquestación, service boundaries y cómo las capas se coordinan. El detalle algorítmico va a Functional Design.
> **Stack base**: Fastify monolithic con plugins + `fastify.decorate` para DI + layered folders.

---

## 1. Service layer overview

| Service | Lives in | Implements | Decorated as |
|---|---|---|---|
| `ConversationService` | `services/conversation.service.ts` | `IConversationService` | `fastify.conversation` |
| `KnowledgeService` | `services/knowledge.service.ts` (stub MVP) | `IKnowledgeService` | `fastify.knowledge` |
| `SFCCToolset` | `services/sfcc-toolset.service.ts` | `ISFCCToolset` | `fastify.sfccTools` |
| `SessionService` | `services/session.service.ts` | `ISessionService` | `fastify.session` |
| `HandoffService` | `services/handoff.service.ts` | `IHandoffService` | `fastify.handoff` |
| `ComplianceService` | `services/compliance.service.ts` | `IComplianceService` | `fastify.compliance` |
| `LoggerService` | `services/logger.service.ts` | `ILoggerService` | `fastify.appLogger` |
| `DashboardService` | `services/dashboard.service.ts` | `IDashboardService` | `fastify.dashboard` |
| `AlertingService` | `services/alerting.service.ts` | `IAlertingService` | `fastify.alerting` |
| `BrandConfigService` | `services/brand-config.service.ts` | `IBrandConfigService` | `fastify.brandConfig` |
| `RolloutGate` | `services/rollout-gate.service.ts` | `IRolloutGate` | `fastify.rolloutGate` |

**Convención**: cada servicio se instancia una vez por proceso (singleton dentro del Fastify instance). Las dependencies se inyectan vía constructor en `app.ts` cuando se construye el Fastify instance.

---

## 2. Orquestación del turno (Caso 1 — happy path)

Esta es la orquestación más crítica del MVP. Soporta los stories E1-S1 a E1-S6.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    participant Widget as Widget Chat<br/>(SFCC)
    participant Route as POST /chat<br/>(controller)
    participant Conv as ConversationService<br/>(M1)
    participant Sess as SessionService<br/>(M4)
    participant Comp as ComplianceService<br/>(M6)
    participant LLM as Bedrock Client<br/>(@anthropic-ai/bedrock-sdk)
    participant Tools as SFCCToolset<br/>(M3)
    participant Logger as LoggerService<br/>(M7)
    participant DB as Postgres

    Cliente->>Widget: escribe mensaje
    Widget->>Route: POST /chat {brand, message, sessionToken?}
    Route->>Route: Zod validation (SECURITY-05)
    Route->>Conv: handleTurn(input)

    Conv->>Sess: resolveIdentity(req)
    Sess->>DB: lookup session / verify guest match
    Sess-->>Conv: IdentityResult

    Conv->>Comp: requireConsent(conversationId)
    alt consent not granted
        Comp-->>Conv: false (gate)
        Conv-->>Route: response solicitando consent
        Route-->>Widget: 200 OK
    else consent granted
        Conv->>LLM: invoke con system_prompt + few_shot + tools[get_order_status]
        LLM-->>Conv: tool_use {tool: "get_order_status", input}

        Conv->>Tools: getOrderStatus(input)
        Tools->>Tools: retry/circuit breaker
        Tools-->>Conv: OrderStatusOutput

        Conv->>LLM: invoke con tool_result
        LLM-->>Conv: respuesta en voz Patprimo

        Conv->>Conv: applyOutputGuardrails(response)
        Conv->>Sess: appendTurn(conversationId, turnRecord)
        Conv->>Logger: logTurn(turnLogRecord) [PII anonimizada vía Comp.anonymizePII]

        Conv-->>Route: TurnOutput
        Route-->>Widget: 200 OK {response}
        Widget->>Cliente: renderiza respuesta
    end

    Note over Logger,DB: SECURITY-14 — log append-only, retention ≥90d
```

---

## 3. Orquestación del handoff (Caso 5 — escalamiento)

Esta orquestación cubre E3-S1 (detección) → E3-S2 (paquete) → E3-S3 (transferencia).

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    participant Conv as ConversationService<br/>(M1)
    participant Hand as HandoffService<br/>(M5)
    participant Sess as SessionService<br/>(M4)
    participant Comp as ComplianceService<br/>(M6)
    participant Email as Email Service<br/>(nodemailer + mailhog)
    participant Logger as LoggerService

    Cliente->>Conv: mensaje (sentimiento neg / out-of-scope / explicit request)
    Conv->>Hand: evaluateTrigger(ctx)
    Hand-->>Conv: HandoffDecision { handoff: true, reason }

    alt handoff = true
        Conv->>Hand: buildContextPackage(conversationId)
        Hand->>Sess: getConversation(conversationId)
        Sess-->>Hand: ConversationState con histórico
        Hand->>Comp: anonymizePII(history) [solo para LOG; el paquete al agente lleva PII visible]
        Hand-->>Hand: HandoffPayload

        Hand->>Email: dispatchHandoff(payload)
        Email-->>Hand: HandoffResult { handoffTicketId, dispatchedAt, deliveryChannel: "email" }

        Hand->>Logger: logHandoff(record) [PII anonimizada]
        Hand-->>Conv: HandoffResult
        Conv->>Cliente: "Un asesor humano te contactará en X min/horas"
    end
```

---

## 4. Orquestación del Rollout Gate (entrada al widget)

A nivel de widget, antes de que el cliente llegue al endpoint `/chat` de Hermes, el widget consulta `/widget/config` para saber si servir Hermes o el fallback humano. Sustituye el plan original "A/B vs Oct8ne" tras validación 2026-05-25 — Oct8ne no atiende chat (solo batch outbound), por lo que el "otro lado" del split es el **fallback humano-en-horario** (o mensaje informativo fuera de horario), no otro bot.

```mermaid
flowchart LR
    Cliente[Cliente abre widget] --> Edge["GET /widget/config?brand=patprimo&sessionId=..."]
    Edge --> KillCheck{hermes_enabled?}
    KillCheck -->|false kill switch| Fallback[Servir mensaje fallback humano-en-horario]
    KillCheck -->|true| Hash{hash sha256 sessionId+rollout_salt mod 100}
    Hash -->|< hermes_traffic_percentage| Hermes[Routea a Hermes /chat]
    Hash -->|>= hermes_traffic_percentage| Fallback

    Alerts[AlertingService<br/>evalúa rules cada 1 min] -.->|si KPI degrada| SlackEmail[Slack/email al operador]
    SlackEmail -.->|manual decision| Ops((Operador))
    Ops -.->|PATCH /admin/rollout/kill-switch o /traffic-percentage| Edge
```

**Decisión técnica**: `shouldServeHermes()` es **stateless por request**, determinístico por `sessionId + rollout_salt`. Cache in-memory 60s en RolloutGate para hot-path del widget. *Auto-rollback automático por degradación de KPI = Fase 2 per Unit 3 NFR-R; MVP usa alerting → acción manual del operador alertado vía Slack/email.*

---

## 5. Communication patterns

### 5.1 Intra-process (todos los módulos viven en el mismo proceso Node)
- **Inter-service**: invocación directa de método. Sin queue, sin event bus.
- **Estado compartido**: a través de Postgres y de `fastify.decorate` para singletons de configuración (ej. `fastify.bedrockClient`).
- **Concurrencia**: Node async I/O. Pool de conexiones pg = 10 default (ajustable). No usar transacciones long-lived.

### 5.2 External
- **A SFCC**: HTTP REST sobre OCAPI/SCAPI. `axios` o `undici` (decisión en Code Generation).
- **A Bedrock**: SDK `@anthropic-ai/bedrock-sdk` (request/response; streaming en Fase 2 si latencia lo exige).
- **A Email Service**: SMTP vía `nodemailer` (mailhog en dev; SMTP real Fase 2 — WhatsApp Business / Salesforce Service Cloud planificados como targets alternativos para Fase 2). El pipeline DeliveryAdapter de M5 encapsula este outbound.
- **A frontend (widget)**: HTTP JSON sobre `/chat`, `/widget/config`, `/health`, etc. CORS restricted a origins explícitos de SFCC (SECURITY-08).

### 5.3 Background jobs (MVP scope)
| Job | Frecuencia | Servicio | Notas |
|---|---|---|---|
| Session cleanup | 30 min | SessionService.closeStale | TTL-based |
| Retention enforcement | Daily | ComplianceService.enforceRetention | purga registros vencidos |
| Alert rule evaluator | 1 min | AlertingService.evaluateRules | dispara notificaciones (Slack/email) al operador; auto-rollback por KPI degradado = Fase 2 (MVP requiere acción manual del operador) |

**Runner**: para MVP, jobs corren dentro del mismo proceso usando `node-cron` o `setInterval` con jitter. En Fase 2 → mover a worker dedicado o scheduler AWS.

---

## 6. Boundaries & responsibilities resumen

| Boundary | Responsabilidad clara | NO debe hacer |
|---|---|---|
| **Controllers** (`controllers/`) | Validación Zod, routing HTTP, mapping request→service input, mapping service output→HTTP response | Business logic, queries SQL directas |
| **Services** (`services/`) | Business logic, orquestación entre servicios, llamadas a repos | Manejar HTTP (no leer headers, no setear cookies), conocer Fastify internals |
| **Repositories** (`repositories/`) | Acceso a Postgres vía `pg` driver, queries SQL parametrizadas | Business logic, validación, llamadas a otros servicios |
| **Models** (`models/`) | Zod schemas + TS types derivados | Lógica, side-effects |
| **Tools** (`tools/`) | Wrappers sobre APIs externas (SFCC, Bedrock); retry/circuit-breaker | Conocer la conversación o el modelo de datos interno (los tools son consumidos por el orquestador) |
| **Plugins** (`plugins/`) | Registrar rutas, decorations, hooks; conectar capas a Fastify | Implementar business logic |

---

## 7. Security Compliance Summary

| Rule | Status | Notas |
|---|---|---|
| SECURITY-05 | Aplicado | Validación Zod en boundary de controllers; cada service method recibe DTOs ya validados |
| SECURITY-08 | Aplicado | CORS restricted en plugin de chat; cada endpoint admin requiere middleware de auth (definido en Functional Design Unit 2) |
| SECURITY-11 | Aplicado | Service boundaries enforcement; M6 Compliance es el ÚNICO módulo que toca PII raw; rate limiting en `/chat` (plugin level) |
| SECURITY-15 | Aplicado | Errores se propagan; CC-2 Global Error Handler centraliza el fail-closed; `try/finally` para releases de DB connection en repositories |
| SECURITY-01, 02, 03, 04, 06, 07, 09, 10, 12, 13, 14 | N/A en este stage | Infra/deploy/code-level — evaluados en NFR Design, Infrastructure Design, Code Generation |

*No hay findings bloqueantes en este stage.*
