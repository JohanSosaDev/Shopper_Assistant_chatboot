# Components — Hermes

**Stack base** (de `requirements.md` §7 + `application-design-plan.md` Q1–Q7):
TypeScript + Node ≥20 + Fastify (monolithic plugin pattern) + Postgres (pg driver crudo) + Bedrock vía `@anthropic-ai/bedrock-sdk` + Zod + layered folder organization.

**Cada componente de PRD §9 (M1–M8) se materializa como**:
1. Un **Fastify plugin** (en `hermes/src/plugins/`) que registra rutas/decorations.
2. Una o más **service classes** (en `hermes/src/services/`) con la lógica de negocio.
3. Cero o más **repositories** (en `hermes/src/repositories/`) para acceso a Postgres.
4. **Models/Schemas** Zod (en `hermes/src/models/`) compartidos por capas.

---

## Componentes lógicos (1:1 con PRD §9)

### M1 — Conversation
- **Purpose**: Punto de entrada del cliente; orquesta cada turno (clasificar intención, ejecutar tools, generar respuesta).
- **Responsibilities**: Recepción de mensajes desde el widget; carga de system prompt + few-shot por marca; coordinación con M2/M3/M4; aplicación de guardrails; decisión de handoff (delega a M5).
- **Public interface**:
  ```ts
  interface IConversationService {
    handleTurn(input: TurnInput): Promise<TurnOutput>;
  }
  ```
- **Stories cubiertas**: E1-S1, E1-S3, E1-S4, E1-S5.
- **Principles visibles** (PRD §6): P1, P3, P5, P7.

### M2 — Knowledge Base (RAG)
- **Purpose**: Búsqueda semántica en catálogo + políticas (Fase 2). En MVP, presente como placeholder (no se usa en Caso 1).
- **Responsibilities (MVP mínimo)**: Stub que retorna `null` o `[]`. Tabla pgvector creada pero ingest pipeline no construido en esta iteración.
- **Responsibilities (Fase 2)**: Ingest pipeline catálogo SFCC → embeddings → pgvector; búsqueda semántica filtrada por marca; curación; versionado.
- **Public interface (MVP)**:
  ```ts
  interface IKnowledgeService {
    search(query: string, brand: BrandId, k?: number): Promise<KnowledgeHit[]>;
  }
  ```
- **Stories cubiertas**: ninguna directa en MUST HAVE (preparación para Fase 2).
- **Principles visibles**: P3, P7.

### M3 — SFCC Integrations
- **Purpose**: Adapter sobre SFCC OCAPI/SCAPI; expone tools al LLM (no expone API HTTP pública).
- **Responsibilities**: Implementar `get_order_status`, `check_inventory` (Fase 2), `get_customer_profile` (futuro); retry con exponential backoff; circuit breaker; sanitización de salida (pre-pasarla al LLM, defensa contra prompt injection via datos).
- **Public interface**:
  ```ts
  interface ISFCCToolset {
    getOrderStatus(input: GetOrderStatusInput): Promise<OrderStatusOutput>;
    // future: checkInventory, getCustomerProfile, initiateReturn
  }
  ```
- **Stories cubiertas**: E1-S3.
- **Principles visibles**: P1, P4, P7.

### M4 — Identity & Session
- **Purpose**: Identificación dual (SFCC session vs guest); gestión de conversation_state en Postgres con TTL.
- **Responsibilities**: Validar sesión SFCC desde token/cookie; flujo guest-friendly (matching order_id + email); cierre por inactividad (30 min default); identificación de recurrente dentro de la sesión.
- **Public interface**:
  ```ts
  interface ISessionService {
    resolveIdentity(req: IdentityRequest): Promise<IdentityResult>;
    getConversation(conversationId: ConversationId): Promise<ConversationState | null>;
    appendTurn(conversationId: ConversationId, turn: TurnRecord): Promise<void>;
    closeStale(thresholdMin: number): Promise<number>; // job runnable
  }
  ```
- **Stories cubiertas**: E1-S2.
- **Principles visibles**: P4, P5, P7.

### M5 — Human Handoff
- **Purpose**: Detectar triggers de handoff; construir paquete de contexto; transferir al widget Oct8ne.
- **Responsibilities**: Evaluar sentimiento, intención, request explícito, confidence; construir payload con identidad + histórico + sentimiento + intento del bot + categoría sugerida; entregar al widget Oct8ne vía su API/event-bridge; persistir audit log del handoff.
- **Public interface**:
  ```ts
  interface IHandoffService {
    evaluateTrigger(ctx: TurnContext): HandoffDecision;
    buildContextPackage(conversationId: ConversationId): Promise<HandoffPayload>;
    transferToOct8ne(payload: HandoffPayload): Promise<HandoffResult>;
  }
  ```
- **Stories cubiertas**: E3-S1, E3-S2, E3-S3, E3-S4.
- **Principles visibles**: P2, P7.

### M6 — Compliance
- **Purpose**: PII anonymization, autorización expresa, retención por país, derecho al olvido, observación de inferencia regional.
- **Responsibilities**: Detectar y tokenizar PII en logs (cleartext nunca persistido); gestionar el flujo de consent (mostrar prompt + capturar respuesta); aplicar policy de retención y purgar registros vencidos; ejecutar derecho al olvido por customer_id_hash; verificar que las llamadas a Bedrock usan endpoint LATAM.
- **Public interface**:
  ```ts
  interface IComplianceService {
    anonymizePII(text: string): { redacted: string; mapping: PIIMap };
    captureConsent(conversationId: ConversationId, granted: boolean): Promise<ConsentRecord>;
    requireConsent(conversationId: ConversationId): Promise<boolean>; // gate
    enforceRetention(): Promise<RetentionReport>; // scheduled job
    forgetCustomer(customerIdHash: string): Promise<DeletionReceipt>;
  }
  ```
- **Stories cubiertas**: E1-S1, E1-S6 (parte PII).
- **Principles visibles**: P4, P5, P7.

### M7 — Observability
- **Purpose**: Logs estructurados append-only; dashboard del operador; dashboard ejecutivo; alertas configurables.
- **Responsibilities**: Persistir log por turno con esquema completo (PRD §10); exponer queries para dashboards; emitir métricas a un sink (CloudWatch en Fase 2; stdout estructurado JSON en MVP local); detectar reglas de alerta y notificar (Slack/email/webhook).
- **Public interface**:
  ```ts
  interface ILoggerService {
    logTurn(turn: TurnLogRecord): Promise<void>;
    logHandoff(handoff: HandoffLogRecord): Promise<void>;
    logGuardrailEvent(evt: GuardrailLogRecord): Promise<void>;
  }

  interface IDashboardService {
    getKpiSnapshot(filters: KpiFilters): Promise<KpiSnapshot>;
    listEscalations(filters: EscalationFilters): Promise<Escalation[]>;
    getConversation(conversationId: ConversationId): Promise<ConversationView>;
  }

  interface IAlertingService {
    registerRule(rule: AlertRule): Promise<RuleId>;
    evaluateRules(): Promise<TriggeredAlert[]>; // scheduled job
  }
  ```
- **Stories cubiertas**: E1-S6, E2-S1, E2-S2, E2-S3, E2-S4.
- **Principles visibles**: P3, P6, P7.

### M8 — Brand Configuration
- **Purpose**: Repositorio de configs por marca (system prompt, few-shot, tono, identidad customer-facing); sign-off del Brand Manager; A/B routing config.
- **Responsibilities**: CRUD de configs versionadas; gate de activación con sign-off auditable; expose config por marca al runtime de M1; gestionar la regla de split A/B Hermes vs Oct8ne.
- **Public interface**:
  ```ts
  interface IBrandConfigService {
    getActive(brand: BrandId): Promise<BrandConfig>;
    list(brand: BrandId): Promise<BrandConfigVersion[]>;
    submit(draft: BrandConfigDraft): Promise<BrandConfigVersion>;
    approve(versionId: VersionId, approver: ApproverIdentity): Promise<BrandConfigVersion>;
    activate(versionId: VersionId): Promise<void>;
    rollback(brand: BrandId): Promise<BrandConfigVersion>;
  }

  interface IABRoutingService {
    decideBot(req: ABDecisionInput): "hermes" | "oct8ne";
    getCurrentSplit(): Promise<ABSplitConfig>;
    setSplit(config: ABSplitConfig, actor: ActorIdentity): Promise<void>;
    autoRollback(rule: ABRollbackRule): Promise<RollbackEvent>;
  }
  ```
- **Stories cubiertas**: E4-S1, E4-S2.
- **Principles visibles**: P3.

---

## Componentes cross-cutting (infraestructura)

### CC-1 — Composition Root (`app.ts`)
- **Purpose**: Entry point. Construye Fastify, registra plugins (M1–M8), conecta pg, monta Bedrock client, configura Zod type provider, registra global error handler.
- **Public interface**:
  ```ts
  function buildApp(config: AppConfig): Promise<FastifyInstance>;
  ```

### CC-2 — Global Error Handler
- **Purpose**: Captura excepciones no manejadas (SECURITY-15 fail-closed); logging del error; respuesta genérica al cliente sin stack trace.
- **Patrón**: `fastify.setErrorHandler(...)` + dominio-conscious mapping de errores a HTTP status.

### CC-3 — Request Context (correlation-id)
- **Purpose**: Cada request lleva `request_id`, `conversation_id`, `customer_id_hash` (cuando aplica). Disponible vía `fastify.decorateRequest` para que logger lo incluya automáticamente en cada log line.

### CC-4 — Database Migrations
- **Purpose**: Mantener schema de Postgres versionado.
- **Tool**: `node-pg-migrate` o `postgres-migrations` (decisión final en NFR Design / Code Generation).
- **Convención**: migrations en `hermes/migrations/`, una por feature.

---

## Mapping a Units (de `requirements.md` §8)

| Componente | Unit 1 (Core Agente) | Unit 2 (Knowledge & Brand Voice) | Unit 3 (Handoff & Convivencia) |
|---|---|---|---|
| M1 Conversation | ✅ Primary | — | — |
| M2 Knowledge | — | ✅ Stub mínimo | — |
| M3 SFCC Integrations | ✅ Primary | — | — |
| M4 Identity & Session | ✅ Primary | — | — |
| M5 Handoff | — | — | ✅ Primary |
| M6 Compliance | ✅ Primary | — | — |
| M7 Observability | ✅ Primary | — | — |
| M8 Brand Configuration | — | ✅ Primary | ✅ Primary (A/B routing) |
| CC-1..4 Infraestructura | ✅ Primary | — | — |

---

## Security Compliance Summary

| Rule | Status | Aplicación a este artefacto |
|---|---|---|
| SECURITY-05 | Aplicado | Zod adopta el rol de input validation; cada controller valida vía Zod schema antes de invocar el service |
| SECURITY-08 | Aplicado (parcialmente) | Middleware de auth a definir en Functional Design Unit 1; pero ya se declara que TODOS los endpoints requieren autenticación salvo el chat público con consent dinámico |
| SECURITY-11 | Aplicado | Separación de M6 (security/compliance) como módulo dedicado; rate limiting en M1 (a definir) |
| SECURITY-15 | Aplicado | CC-2 Global Error Handler obligatorio; cada service method retorna `Result<T, E>` o throws explícito |
| SECURITY-01, 02, 03, 04, 06, 07, 09, 10, 12, 13, 14 | N/A en este stage | Específicos de infra/code/build — se evalúan en NFR Design, Infrastructure Design, Code Generation, Build/Test |

*No hay findings bloqueantes en este stage.*
