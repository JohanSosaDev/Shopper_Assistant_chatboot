# Hermes Architecture

## Request flow

```
Client (widget/browser)
  │ POST /chat { conversation_id, brand, message }
  ▼
M1 Plugin ──→ ParseRequest
                  │
                  ▼
            InputGuardrails ──→ block? → early exit
                  │
                  ▼
            ResolveIdentity ──→ session_token / guest_proof / anonymous
                  │
                  ▼
            ConsentGate ──→ denied? → early exit
                  │
                  ▼
            LoadBrandConfig ──→ system prompt, texts, policy version
                  │
                  ▼
            ClassifyIntent ──→ get_order_status / fallback
                  │
                  ▼
            ExecuteTools ──→ SFCC mock/real client
                  │
                  ▼
            GenerateResponse ──→ Bedrock Claude Haiku
                  │
                  ▼
            OutputGuardrails ──→ block? → redact
                  │
                  ▼
            PersistTurn ──→ DB insert
                  │
                  ▼
            LogTurn ──→ audit log + PII map
```

## Pipeline (10 steps)

Defined in `src/services/orchestrator/steps/`:

| Step | File | Exit reason |
|---|---|---|
| 1. ParseRequest | `parse-request.step.ts` | — |
| 2. InputGuardrails | `input-guardrails.step.ts` | `blocked_by_guardrails` |
| 3. ResolveIdentity | `resolve-identity.step.ts` | — |
| 4. ConsentGate | `consent-gate.step.ts` | `consent_denied`, `consent_ambiguous` |
| 5. LoadBrandConfig | `load-brand-config.step.ts` | — |
| 6. ClassifyIntent | `classify-intent.step.ts` | — |
| 7. ExecuteTools | `execute-tools.step.ts` | — |
| 8. GenerateResponse | `generate-response.step.ts` | — |
| 9. OutputGuardrails | `output-guardrails.step.ts` | `output_blocked` |
| 10. PersistTurn | `persist-turn.step.ts` | — |
| 11. LogTurn | `log-turn.step.ts` | — |

## SFCC Mode

Switchable via `SFCC_MODE` env var:
- **mock**: reads from `fixtures/demo-orders.json`, no network calls
- **real**: OAuth client credentials to SFCC `/dw/shop/v1/orders`

## Guardrails

- **Input** (5 patterns): role redefinition, prompt extraction, persona injection, script/iframe, token stuffing (>4000 chars)
- **Output** (6 checks): system prompt leak, discount promises, competitor mention, internal info, grounding mismatch

## Database

Postgres 16 + pgvector. 5 migrations (`0001_unit1_base.sql` → `0005_unit1_audit.sql`).

Tables: `conversations`, `turn_log`, `consent_records`, `brand_configs`, `turn_log_pii_map`, `system_config`.

## Widget

Vanilla TypeScript bundle built with esbuild. IIFE format exports `HermesWidget.init()`.
