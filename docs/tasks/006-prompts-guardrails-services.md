---
id: 006-prompts-guardrails-services
title: "Prompts Patprimo + Guardrails input/output + Services"
milestone: m3-business-logic
priority: high
estimation: L
blockedBy: ["003-config-and-repos"]
blocks: ["007-pipeline-orchestrator"]
status: done
closed_by_commit: 5628ea9
---

## Summary

Prompts Patprimo (system + few-shot + textos UX) seedeados en brand_configs vía `npm run seed`. Guardrails input (regex categóricas para detectar jailbreaks, PII no autorizado, intentos de injection) y output (grounding check, no-secret-leak, no-competitor). Servicios M4/M6/M7/M8: session (resolveIdentity + ensureExists conversation), compliance (anonymize + consent eval/capture), brand-config (getActive read-only), logger (logTurn con redacción), knowledge stub (search retorna [] — Unit 2 lo implementa).

## Scope (deliverables)

Prompts (`hermes/src/prompts/patprimo/`):
- `system.prompt.ts` — system prompt hardened de Patprimo
- `few-shot.ts` — 10+ ejemplos (greeting, order_status happy/not_found, out_of_scope, edge cases)
- `texts.ts` — consentRequestText, consentDeniedText, neutralFallbackText

Guardrails (`hermes/src/guardrails/`):
- `input.guards.ts` — patterns R-GUARD-IN-1 (jailbreak, injection, PII)
- `output.guards.ts` — patterns R-GUARD-OUT-1 (grounding, secret leak, competitor mention)

Services (`hermes/src/services/`):
- `session.service.ts` — resolveIdentity (sfcc_session vs guest) + getOrCreateConversation
- `compliance.service.ts` — anonymize + evaluateConsent (regex permisiva, fix bug #5) + captureConsent + hasGrantedConsent
- `brand-config.service.ts` — getActive (stub Unit 1: solo seed Patprimo)
- `logger.service.ts` — logTurn estructurado con redacción obligatoria
- `knowledge.service.ts` — search() retorna [] (stub Unit 2)

## Acceptance criteria

- [x] Seed inserta brand_config Patprimo con system_prompt + texts completos
- [x] evaluateConsent("Si, acepto") → granted (fix bug #5 con regex `\b...\b`)
- [x] evaluateConsent("no autorizo") → denied
- [x] anonymizePII detecta emails/phones/orders/cedulas en mensajes
- [x] logger.logTurn rechaza texto NO RedactedText en compile-time (R-PII-4)

## Test plan

- Unit: tests/unit/services/{compliance,session,logger}.test.ts
- Unit: tests/unit/guardrails/{input,output}.test.ts con 10+ jailbreaks
- Smoke suite cubre flow happy + edge

## Context

- Plan AI-DLC: Steps 9 + 10 + 11 del plan U1
- M2/M4/M6/M7/M8 servicios: `application-design/services.md`
- R-GUARD-IN/OUT rules: `business-rules.md`
- Bug #5 (regex consent strict): commit ac396fd

## Definition of ready

- [x] Models (consent, brand-config, turn-log) listos (task 002)
- [x] Repositories listos (task 003)
- [x] R-* rules numeradas en business-rules.md
