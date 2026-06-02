# Component Dependencies — Hermes

> **Scope**: Matriz de dependencias entre los 8 módulos M1–M8 + cross-cutting CC-1..4, patrones de comunicación, y data flow diagrams.

---

## 1. Dependency Matrix

Una fila depende de las columnas marcadas con ✅. "Dependencia" = invoca métodos públicos directamente o consume eventos/contratos del otro componente.

| ↓ depende de → | M1 Conv | M2 Know | M3 SFCC | M4 Sess | M5 Hand | M6 Comp | M7 Obs | M8 Brand | CC App | DB |
|---|---|---|---|---|---|---|---|---|---|---|
| **M1 Conversation** | — | ✅ (Fase 2) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| **M2 Knowledge** | — | — | — | — | — | — | ✅ | ✅ | — | ✅ |
| **M3 SFCC Integrations** | — | — | — | — | — | — | ✅ | — | — | — |
| **M4 Identity & Session** | — | — | — | — | — | — | ✅ | — | — | ✅ |
| **M5 Handoff** | — | — | ✅ (orderHistory) | ✅ | — | ✅ (PII anon en log) | ✅ | ✅ (brand context) | — | ✅ |
| **M6 Compliance** | — | — | — | — | — | — | ✅ | — | — | ✅ |
| **M7 Observability** | — | — | — | — | — | — | — | — | — | ✅ |
| **M8 Brand Config + RolloutGate** | — | — | — | — | — | — | ✅ | — | — | ✅ |
| **CC-1 App (composition root)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| **CC-2 Global Error Handler** | — | — | — | — | — | — | ✅ | — | — | — |
| **CC-3 Request Context** | — | — | — | — | — | — | ✅ | — | — | — |

**Observaciones:**
1. **M1 es el hub** — depende de casi todos los demás. Esperable: es el orquestador del turno.
2. **M7 Observability NO depende de nadie** — todos los demás lo invocan, pero él solo escribe a DB. Es un sumidero, no un orquestador.
3. **M6 Compliance** está aislado — solo depende de DB y M7. Esto satisface SECURITY-11 (separation of security-critical logic).
4. **M2 Knowledge** es práticamente standalone en MVP — solo M1 lo consume (Fase 2). En MUST HAVE, no se usa.
5. **No hay dependencias circulares** — verificado visualmente. M1 → M5 → M3 forma una cadena, no un ciclo.

---

## 2. Communication Patterns

### 2.1 Sync, in-process method calls (default)
Casi toda la comunicación entre módulos es **invocación directa de métodos async** sobre las instancias singleton inyectadas vía `fastify.decorate`. No queue, no event bus, no IPC.

**Justificación**: monolithic Fastify app (Q1=A), proceso único, MVP scope, latencia objetivo agresiva (<30s p50). Agregar broker (Kafka, SQS) sería sobre-engineering.

### 2.2 Persistent state via Postgres
Cualquier estado que cruza requests vive en Postgres. Ejemplos:
- `conversation_state` (M4)
- `consent_log` (M6)
- `turn_log` (M7)
- `handoff_log` (M5)
- `brand_config_versions` (M8)
- `system_config` con `rollout_salt`, `hermes_enabled`, `hermes_traffic_percentage`, `handoff_stub_message` + `system_config_audit` (M8)

### 2.3 External HTTP (sync)
Tres outbound integrations:
- **SFCC OCAPI/SCAPI** (M3) — REST/JSON
- **AWS Bedrock LATAM** (M1 vía SDK) — invocación SDK que internamente hace HTTPS
- **Email Service** (M5) — SMTP vía `nodemailer` (mailhog en dev; SMTP real Fase 2 — WhatsApp Business o Salesforce Service Cloud planificados como targets alternativos Fase 2)

Todas con: retry exponential backoff (3 attempts), circuit breaker, timeout explícito (10s default por call).

### 2.4 Background jobs (intra-process)
Implementación MVP: `node-cron` o `setInterval` dentro del mismo proceso Fastify.
- Session cleanup (M4) — cada 30 min
- Retention enforcement (M6) — daily
- Alert rule evaluator (M7) — cada 1 min (alerta al operador vía Slack/email; auto-rollback por degradación de KPI = Fase 2 per Unit 3 NFR-R)

**Riesgo conocido**: si el proceso crashea, los jobs no se ejecutan. **Aceptable en MVP** porque Docker Compose puede restart-on-failure. Fase 2 → migrar a scheduler externo.

---

## 3. Data Flow Diagrams

### 3.1 Turno completo (MUST HAVE Caso 1)

```mermaid
flowchart LR
    Cliente([Cliente]) -->|POST /chat| Controller[Chat Controller]
    Controller -->|Zod validate| ConvSvc[ConversationService M1]

    ConvSvc -->|resolveIdentity| SessSvc[SessionService M4]
    SessSvc -->|SELECT| PG[(Postgres)]

    ConvSvc -->|requireConsent| CompSvc[ComplianceService M6]
    CompSvc -->|SELECT consent_log| PG

    ConvSvc -->|getActive brand config| BrandSvc[BrandConfigService M8]
    BrandSvc -->|SELECT brand_config_versions| PG

    ConvSvc -->|invoke prompt + tools| Bedrock[(AWS Bedrock<br/>Haiku 4.5)]
    Bedrock -->|tool_use| ConvSvc

    ConvSvc -->|getOrderStatus| SFCCTools[SFCCToolset M3]
    SFCCTools -->|GET /orders/...| SFCC[(SFCC OMS)]
    SFCC -->|order data| SFCCTools
    SFCCTools -->|OrderStatusOutput| ConvSvc

    ConvSvc -->|invoke con tool_result| Bedrock
    Bedrock -->|respuesta voz Patprimo| ConvSvc

    ConvSvc -->|applyOutputGuardrails| ConvSvc
    ConvSvc -->|appendTurn| SessSvc
    SessSvc -->|INSERT turn_log| PG

    ConvSvc -->|anonymizePII| CompSvc
    ConvSvc -->|logTurn| Logger[LoggerService M7]
    Logger -->|INSERT turn_log_audit| PG

    ConvSvc -->|response| Controller
    Controller -->|200 OK| Cliente

    style ConvSvc fill:#4CAF50,color:#fff
    style PG fill:#9cf,color:#000
    style Bedrock fill:#FFB300,color:#000
    style SFCC fill:#FFB300,color:#000
```

### 3.2 Handoff con paquete de contexto

```mermaid
flowchart LR
    M1[ConversationService M1] -->|evaluateTrigger ctx| M5[HandoffService M5]
    M5 -->|decision: handoff=true| M5

    M5 -->|getConversation| M4[SessionService M4]
    M4 -->|history| M5

    M5 -->|getActive config| M8[BrandConfigService M8]
    M8 -->|brand context| M5

    M5 -->|build HandoffPayload| Payload[(HandoffPayload<br/>identidad + history +<br/>intent + sentiment +<br/>order history + category)]

    Payload -->|dispatchHandoff| Email[Email Service<br/>nodemailer + mailhog]
    Email -->|handoffTicketId HT-2026-XXXX| M5

    M5 -->|anonymizePII history| M6[ComplianceService M6]
    M5 -->|logHandoff| M7[LoggerService M7]

    style M5 fill:#4CAF50,color:#fff
    style Payload fill:#FFB300,color:#000
    style Email fill:#FFB300,color:#000
```

### 3.3 Rollout Gate al inicio de la sesión

```mermaid
flowchart TB
    Widget([Widget SFCC]) -->|GET /widget/config?brand=patprimo&sessionId=X| WCfgCtrl[Widget Config Controller]
    WCfgCtrl -->|shouldServeHermes identifier| RGate[RolloutGate M8]
    RGate -->|getConfig cached 60s| PG[(Postgres<br/>system_config)]
    PG -->|hermes_enabled + traffic_pct + rollout_salt| RGate
    RGate -->|hash sha256 identifier+rollout_salt mod 100| RGate
    RGate -->|boolean: serve hermes?| WCfgCtrl
    WCfgCtrl -->|200 OK target: hermes o fallback| Widget

    Cron[AlertingService cron 1min] -.->|evaluate rules| Alert[Alert]
    Alert -.->|Slack/email a operador| Operator((Operador))
    Operator -.->|manual: PATCH /admin/rollout/kill-switch| PG

    style RGate fill:#4CAF50,color:#fff
```

*Nota*: auto-rollback por degradación de KPI = Fase 2 per Unit 3 NFR-R. MVP usa alerting → operador alertado → acción manual via `PATCH /admin/rollout/kill-switch` o `PATCH /admin/rollout/traffic-percentage`.

---

## 4. Critical paths para Code Generation

Cuando lleguemos a Code Generation por unit, estos son los flujos que **no pueden romperse**:

| Path | Pasos | Stories | Riesgo si falla |
|---|---|---|---|
| **P-1 Happy Caso 1** | Cliente → /chat → consent → tool call SFCC → respuesta | E1-S1..S6 | MVP no demo-able |
| **P-2 Handoff** | Trigger detectado → context package → notificación email/teléfono al equipo CX | E3-S1..S4 | Anti-pattern ASOS, riesgo regulatorio |
| **P-3 RolloutGate + kill switch** | shouldServeHermes → routing decision (hermes vs fallback humano) → alerts si KPI degrada → operador manual kill switch | E4-S2 | No se valida promesa de conversión; sin kill switch operativo, no hay safety net (auto-rollback automático = Fase 2) |
| **P-4 Logging audit** | Cada turno → log estructurado → append-only persistido | E1-S6 | No defensa ante SIC |

Functional Design por unit debe priorizar estos en orden P-1 > P-4 > P-2 > P-3.

---

## 5. Security Compliance Summary

| Rule | Status | Notas |
|---|---|---|
| SECURITY-08 | Aplicado | Diagramas hacen explícito que `/chat` es público pero requiere consent gate; `/widget/config` es público stateless (RolloutGate hot-path cacheado 60s); endpoints admin (incluyendo `/admin/rollout/*` solo rol `admin`) requieren auth middleware (definido en Functional Design Unit 2) |
| SECURITY-11 | Aplicado | Diagrama de dependencia muestra M6 aislado; secrets (Bedrock credentials, SFCC tokens) no aparecen en flow — se cargan vía env vars y secret manager |
| Otros | N/A en este stage | Code-level — se evalúan en stages siguientes |

*No hay findings bloqueantes en este stage.*
