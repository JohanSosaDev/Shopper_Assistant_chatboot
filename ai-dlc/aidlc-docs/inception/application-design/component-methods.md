# Component Methods — Hermes

> **Scope**: Method signatures (TS interface) por componente. **No incluye** business logic detallada — eso se trata en Functional Design por unit, en Construction Phase.
> **Format**: TypeScript interfaces con tipos de input/output. Los tipos compuestos referenciados se definen en `hermes/src/models/`.

---

## Shared types (referencias usadas abajo)

```ts
type BrandId = "patprimo" | "seven_seven" | "ostu" | "atmos";
type ConversationId = string; // UUID
type CustomerIdHash = string; // sha256 hex
type Iso8601 = string;

interface TurnInput {
  conversationId: ConversationId;
  brand: BrandId;
  rawText: string;
  customerIdHash?: CustomerIdHash;
  sessionToken?: string;
  channel: "web";
}

interface TurnOutput {
  responseText: string;
  toolsUsed: string[];
  intent: string;
  sentimentScore?: number;
  handoffTriggered: boolean;
  turnId: string;
  latencyMs: number;
}

interface IdentityRequest {
  sessionToken?: string;
  guestProof?: { orderId: string; email: string };
}

interface IdentityResult {
  customerIdHash: CustomerIdHash | null;
  customerProfile: CustomerProfile | null;
  authMethod: "sfcc_session" | "guest_matched" | "guest_unauth";
}
```

---

## M1 — Conversation

```ts
interface IConversationService {
  /** Procesa un turno completo del cliente: identidad → consent gate → intención → tools → respuesta. */
  handleTurn(input: TurnInput): Promise<TurnOutput>;
}
```

**Internal helpers (no expuestos externamente, pero referenciados):**

```ts
interface IOrchestrator {
  classifyIntent(text: string, brand: BrandId): Promise<IntentClassification>;
  callLlm(prompt: LlmPrompt, tools: ToolSpec[]): Promise<LlmResponse>;
  applyOutputGuardrails(response: string): GuardrailResult;
}
```

---

## M2 — Knowledge Base

```ts
interface IKnowledgeService {
  /** MVP: retorna [] hasta Fase 2; signature listo para no romper contrato cuando se implemente RAG. */
  search(query: string, brand: BrandId, k?: number): Promise<KnowledgeHit[]>;
}

interface KnowledgeHit {
  text: string;
  source: string;
  score: number;
}
```

---

## M3 — SFCC Integrations

```ts
interface ISFCCToolset {
  /** Consulta estado de pedido en SFCC OMS. */
  getOrderStatus(input: GetOrderStatusInput): Promise<OrderStatusOutput>;
}

interface GetOrderStatusInput {
  orderId: string;
  email?: string; // requerido si guest
  brand: BrandId;
}

interface OrderStatusOutput {
  orderId: string;
  status: "created" | "paid" | "in_transit" | "delivered" | "cancelled";
  carrier?: string;
  trackingNumber?: string;
  etaIso?: Iso8601;
}
```

**Internal — tool registry (consumido por M1 orchestrator):**

```ts
interface ToolSpec {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  outputSchema: ZodSchema;
  invoke: (input: unknown) => Promise<unknown>;
}

interface IToolRegistry {
  register(tool: ToolSpec): void;
  list(brand: BrandId): ToolSpec[];
  invoke(name: string, input: unknown): Promise<unknown>;
}
```

---

## M4 — Identity & Session

```ts
interface ISessionService {
  resolveIdentity(req: IdentityRequest): Promise<IdentityResult>;
  getConversation(conversationId: ConversationId): Promise<ConversationState | null>;
  appendTurn(conversationId: ConversationId, turn: TurnRecord): Promise<void>;
  closeStale(thresholdMin: number): Promise<number>; // returns # closed; runnable as scheduled job
}

interface ConversationState {
  conversationId: ConversationId;
  brand: BrandId;
  customerIdHash: CustomerIdHash | null;
  consentGranted: boolean | null;
  turns: TurnRecord[];
  startedAt: Iso8601;
  lastActivityAt: Iso8601;
}

interface TurnRecord {
  turnId: string;
  role: "user" | "assistant" | "system";
  text: string;
  toolCalls?: ToolCallRecord[];
  timestamp: Iso8601;
}
```

---

## M5 — Human Handoff

```ts
interface IHandoffService {
  evaluateTrigger(ctx: TurnContext): HandoffDecision;
  buildContextPackage(conversationId: ConversationId): Promise<HandoffPayload>;
  transferToOct8ne(payload: HandoffPayload): Promise<HandoffResult>;
}

interface TurnContext {
  conversationId: ConversationId;
  text: string;
  intent: string;
  confidence: number;
  sentimentScore: number;
  isExplicitHumanRequest: boolean;
}

type HandoffDecision =
  | { handoff: false }
  | {
      handoff: true;
      reason:
        | "sentiment_negative"
        | "out_of_scope_intent"
        | "explicit_request"
        | "low_confidence";
    };

interface HandoffPayload {
  customerIdHash: CustomerIdHash | null;
  brand: BrandId;
  conversationId: ConversationId;
  history: TurnRecord[];
  intent: string;
  sentimentScore: number;
  botAttempt: string | null;
  suggestedCategory: string;
  orderHistory?: OrderSummary[];
}

interface HandoffResult {
  oct8neTicketId: string;
  transferredAt: Iso8601;
  estimatedAgentResponseSeconds?: number;
}
```

---

## M6 — Compliance

```ts
interface IComplianceService {
  anonymizePII(text: string): PIIResult;
  captureConsent(conversationId: ConversationId, granted: boolean): Promise<ConsentRecord>;
  requireConsent(conversationId: ConversationId): Promise<boolean>;
  enforceRetention(): Promise<RetentionReport>;
  forgetCustomer(customerIdHash: CustomerIdHash): Promise<DeletionReceipt>;
}

interface PIIResult {
  redacted: string;
  mapping: Record<string, string>; // <EMAIL_1> -> original-email-hashed (for reversibility in agent view, not log)
}

interface ConsentRecord {
  conversationId: ConversationId;
  granted: boolean;
  timestamp: Iso8601;
  policyVersion: string;
}

interface RetentionReport {
  scannedRecords: number;
  purgedRecords: number;
  oldestRetainedIso: Iso8601;
}

interface DeletionReceipt {
  customerIdHash: CustomerIdHash;
  deletedRecords: number;
  deletedAt: Iso8601;
}
```

---

## M7 — Observability

```ts
interface ILoggerService {
  logTurn(record: TurnLogRecord): Promise<void>;
  logHandoff(record: HandoffLogRecord): Promise<void>;
  logGuardrailEvent(record: GuardrailLogRecord): Promise<void>;
}

interface TurnLogRecord {
  turnId: string;
  conversationId: ConversationId;
  timestampIso: Iso8601;
  customerIdHash: CustomerIdHash | null;
  brand: BrandId;
  intentClassified: string;
  toolsCalled: string[];
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  modelId: string;
  outputTextRedacted: string; // PII anonymized
  sentimentScore: number | null;
  guardrailViolations: string[];
}

interface IDashboardService {
  getKpiSnapshot(filters: KpiFilters): Promise<KpiSnapshot>;
  listEscalations(filters: EscalationFilters): Promise<EscalationSummary[]>;
  getConversation(conversationId: ConversationId): Promise<ConversationView>;
}

interface KpiSnapshot {
  windowStart: Iso8601;
  windowEnd: Iso8601;
  firstResponseP50Ms: number;
  firstResponseP95Ms: number;
  unitCostCop: number;
  conversionRate: number;
  csatAvg: number | null;
  escalationRate: number;
  guardrailViolationsCount: number;
}

interface IAlertingService {
  registerRule(rule: AlertRule): Promise<string>;
  evaluateRules(): Promise<TriggeredAlert[]>; // scheduled
}

interface AlertRule {
  ruleId?: string;
  name: string;
  metric: keyof KpiSnapshot | "guardrail_event" | "handoff_failure";
  threshold: number;
  comparator: "lt" | "gt" | "eq";
  windowMin: number;
  channels: ("slack" | "email" | "webhook")[];
}
```

---

## M8 — Brand Configuration & A/B Routing

```ts
interface IBrandConfigService {
  getActive(brand: BrandId): Promise<BrandConfig>;
  list(brand: BrandId): Promise<BrandConfigVersion[]>;
  submit(draft: BrandConfigDraft): Promise<BrandConfigVersion>;
  approve(versionId: string, approver: ApproverIdentity): Promise<BrandConfigVersion>;
  activate(versionId: string): Promise<void>;
  rollback(brand: BrandId): Promise<BrandConfigVersion>;
}

interface BrandConfig {
  brand: BrandId;
  versionId: string;
  systemPrompt: string;
  fewShotExamples: FewShotExample[];
  customerFacingName: string; // ej. "Sofía de Patprimo"
  tone: "formal_close" | "casual" | "formal";
  language: "es-CO";
  activatedAt: Iso8601;
  approvedBy: ApproverIdentity;
}

interface IABRoutingService {
  decideBot(req: ABDecisionInput): "hermes" | "oct8ne";
  getCurrentSplit(): Promise<ABSplitConfig>;
  setSplit(config: ABSplitConfig, actor: ActorIdentity): Promise<void>;
  autoRollback(rule: ABRollbackRule): Promise<RollbackEvent | null>;
}

interface ABDecisionInput {
  brand: BrandId;
  sessionId: string;
  customerIdHash?: CustomerIdHash;
}

interface ABSplitConfig {
  brand: BrandId;
  hermesPercent: number; // 0–100
  effectiveFrom: Iso8601;
  setBy: ActorIdentity;
}

interface ABRollbackRule {
  metric: "conversion_rate" | "first_response_p95_ms" | "guardrail_violations";
  threshold: number;
  comparator: "lt" | "gt";
  windowMin: number;
  rollbackToSplit: ABSplitConfig;
}
```

---

## Convención general

Todas las interfaces:
- Operan en **async/await**; nada bloqueante.
- Retornan **DTOs planos** (no entidades ORM); facilita testing y serialización.
- Errores **levantados explícitamente** (no objetos `Result<T, E>` para MVP — más simple), capturados por CC-2 Global Error Handler.
- Inputs validados con **Zod schemas** en el boundary del controller antes de invocar el service.
- IDs como `string` (UUIDs); el tipo se podría refinar con branded types en NFR Design si la complejidad lo justifica.

---

## Security Compliance Summary

| Rule | Status | Notas |
|---|---|---|
| SECURITY-05 | Aplicado | Cada method signature documenta tipos esperados; Zod schemas (no incluidos aquí, irán en `models/`) hacen runtime validation |
| SECURITY-12 | Aplicado parcial | `customerIdHash` es siempre hash (no PII raw en interfaces); `sessionToken` se valida server-side |
| Otros | N/A | Code-level — se evalúa en Code Generation |
