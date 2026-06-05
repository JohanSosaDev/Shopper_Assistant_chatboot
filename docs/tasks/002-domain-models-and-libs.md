---
id: 002-domain-models-and-libs
title: "Modelos Zod con branded types + librerías de utilidad"
milestone: m1-foundation
priority: high
estimation: M
blockedBy: ["001-project-bootstrap-and-schema"]
blocks: ["003-config-and-repos", "005-sfcc-tools-integration", "006-prompts-guardrails-services"]
status: done
closed_by_commit: 5628ea9
---

## Summary

9 modelos Zod cubriendo todo el dominio del Unit 1 (conversation, turn, identity, chat, order, consent, brand-config, turn-log, errors) con branded types para enforcement de invariantes en compile-time. Además 6 utilidades reusables: hashing SHA-256, retry con backoff, circuit breaker, timeout, anonimizador PII (R-PII-1), generador de correlation IDs.

## Scope (deliverables)

Modelos (`hermes/src/models/`):
- `shared.ts` — 11 branded types (ConversationId, TurnId, ConsentId, CustomerIdHash, RedactedText, etc.)
- `conversation.ts` — Conversation + Turn con 5 ENUMs + 4 refinements
- `identity.ts` — IdentityRequest, IdentityResult, CustomerProfile (transient)
- `chat.ts` — ChatRequest/ChatResponse (API) + TurnInput/Output (orchestrator)
- `order.ts` — GetOrderStatusInput/Output/Result con anti-enumeration
- `consent.ts` — ConsentRecord + ConsentDecision
- `brand-config.ts` — BrandConfig + FewShotExample
- `turn-log.ts` — TurnLogRecord + TurnLogInput (RedactedText branded)
- `errors.ts` — HermesError abstract + 9 subclasses + Result<T,E> + normalizeError

Lib (`hermes/src/lib/`):
- `hashing.ts` — sha256(customer_id, salt) per R-PII
- `retry.ts` — withRetry<T> con backoff (R-TOOL-1)
- `circuit-breaker.ts` — withCircuitBreaker<T> (R-TOOL-2)
- `timeout.ts` — withTimeout<T>
- `pii-anonymizer.ts` — anonymizePII(text) regex categórico R-PII-1
- `correlation.ts` — generateRequestId + generateTurnId

## Acceptance criteria

- [x] Todos los schemas pasan `tsc --noEmit` strict
- [x] Branded types impiden mezclar IDs por error (no se puede pasar ConversationId donde se espera TurnId)
- [x] RedactedText enforce R-PII-4 en compile-time
- [x] withRetry hace exponential backoff y respeta maxAttempts
- [x] anonymizePII detecta y reemplaza emails, teléfonos, cédulas, order IDs, tarjetas

## Test plan

- Unit: `tests/unit/lib/pii-anonymizer.test.ts` con casos directos + PBT fast-check
- Unit: `tests/unit/lib/retry.test.ts`, `circuit-breaker.test.ts`, `hashing.test.ts`
- (Implementación de tests fue en task `011-tests-suite`)

## Context

- Plan AI-DLC: Steps 3 + 4 del plan U1
- Domain entities: `ai-dlc/aidlc-docs/construction/unit1-core-agente/functional-design/domain-entities.md`
- NFR design patterns §6.2-§6.3: `ai-dlc/aidlc-docs/construction/unit1-core-agente/nfr-design/`
- PII rules R-PII-1..4: `ai-dlc/aidlc-docs/construction/unit1-core-agente/functional-design/business-rules.md`

## Definition of ready

- [x] Task 001 cerrada (TypeScript proyecto setupeado)
- [x] Domain entities documentadas en AI-DLC
- [x] NFR design aprobado (patterns retry, breaker, error hierarchy)
