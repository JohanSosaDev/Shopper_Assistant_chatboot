# Business Rules — Unit 1: Core Agente

> **Scope**: reglas concretas de negocio para Unit 1. Cada regla está numerada y trazable a una story + módulo.

---

## §1 — Identity rules (M4)

**R-ID-1 — Identificación dual.** El bot acepta dos modos de identificación:
- **SFCC session**: si `sessionToken` válido en el request → identidad confirmada vía SFCC.
- **Guest-friendly**: si no hay session, identidad fuerte se establece cuando el cliente entrega `orderId + email` y ambos matchean un registro válido en SFCC OMS.

**R-ID-2 — Datos incorrectos = mensaje genérico (anti-enumeration).** Si el match `orderId + email` falla:
- El bot **NO confirma ni desconfirma** la existencia del orderId.
- Responde con mensaje genérico (`"no encuentro un pedido con esos datos"`).
- Ofrece reintentar o escalar (handoff en Unit 3).
- *Justificación*: prevenir enumeration attack sobre orderIds.

**R-ID-3 — Tokens hasheados en logs.** Cualquier `customerIdHash` persistido en logs es `sha256(SFCC_customer_id + salt)`. El salt vive en secrets manager.

---

## §2 — Consent gate rules (M6) — Q2=A "Inicio único"

**R-CONS-1 — Consent en el primer turno.** El primer mensaje del bot (turn #1 assistant) **es siempre** el saludo + transparencia + autorización. No importa qué haya escrito el cliente — antes de procesar cualquier consulta, el bot se identifica y pide consent.

**R-CONS-2 — Respuesta afirmativa parseo.** Una respuesta del cliente cuenta como `granted=true` si matchea (case-insensitive, normalizada): `sí`, `si`, `ok`, `okay`, `dale`, `vale`, `claro`, `acepto`, `de acuerdo`, `continuar`. Cualquier otra respuesta cuenta como `granted=false`.

**R-CONS-3 — Re-prompt una vez.** Si la respuesta del cliente al primer prompt de consent **no** matchea afirmación o negación claras (ej. "hola, mi pedido..."), el bot **re-pide consent una vez** explicando por qué es necesario.

**R-CONS-4 — Negación cierra el flujo.** Si `granted=false` explícito, el bot:
- Responde el mensaje de "no podemos continuar sin tu autorización".
- Ofrece canal alternativo (humano vía Oct8ne o WhatsApp Fase 2).
- **NO** procesa ninguna consulta posterior en esa conversación hasta que el cliente cambie de opinión y dé consent.

**R-CONS-5 — Persistencia.** Cada `granted=true` o `granted=false` se inserta en `consent_log` con `(conversationId, granted, timestamp, policyVersion)`. **Append-only** — nunca se borra.

**R-CONS-6 — Reutilización en la sesión.** Una vez `granted=true` está en `consent_log` para una `conversationId`, no se vuelve a pedir consent en el resto de la conversación. Si se abre **nueva conversación** (diferente conversationId), se vuelve a pedir.

**R-CONS-7 — Policy version.** Cada consent capturado lleva la versión del policy text vigente. Cuando el policy cambia, las conversaciones existentes mantienen su versión; nuevas conversaciones piden consent contra la versión nueva.

---

## §3 — Input guardrails (M1) — Q4=C "Input + output"

**R-GUARD-IN-1 — Reglas de matching.** El input del cliente se evalúa contra:

| Categoría | Patrón ejemplo | Action |
|---|---|---|
| Role redefinition | `(?i)\b(ignore|forget|disregard)\s+(all|your|previous)\s+(instructions|prompts|rules)\b` | block |
| Prompt extraction | `(?i)\b(show|reveal|print|tell\s+me)\s+(your\s+)?(system|initial|hidden)\s+(prompt|instructions)\b` | block |
| Persona injection | `(?i)\bact\s+as\s+(an?\s+)?(developer|admin|root|system)\b` | block |
| Token stuffing | mensaje > 4000 chars o más de 200 tokens especiales/símbolos consecutivos | block |
| Markdown/HTML escapes | `<script`, `<iframe`, `javascript:` | block |

**R-GUARD-IN-2 — Acción on block.** Si match → response al cliente: `brandConfig.neutralFallbackText` (algo como "No puedo ayudarte con eso. ¿Hay algo más en lo que pueda apoyarte?"). NO se pasa el input al LLM. Se loguea `guardrail_violations.push("input_jailbreak_attempt")` con el patrón detectado.

**R-GUARD-IN-3 — Falsos positivos aceptables.** Mejor tener algunos falsos positivos (cliente legítimo bloqueado por accidente) que un jailbreak exitoso. El cliente bloqueado puede reformular o pedir humano (botón persistente).

**R-GUARD-IN-4 — Red team mínimo pre-launch.** Suite de mínimo 30 ataques cubriendo OWASP LLM Top 10 (LLM-01 Prompt Injection, LLM-02 Insecure Output, LLM-06 Sensitive Info Disclosure como prioridad). Target ≥95% de rechazo correcto antes de pasar a Build/Test.

---

## §4 — Output guardrails (M1) — Q4=C "Input + output"

**R-GUARD-OUT-1 — Reglas de validación.** La respuesta del LLM antes de enviar al cliente:

| Check | Acción si falla |
|---|---|
| Contiene fragmento del system prompt (substring matching contra >20 chars del prompt) | block + neutral fallback |
| Promesa de descuento sin autorización (regex contra "descuento", "%", "rebaja" combinado con números) | block + neutral fallback |
| Mención de competidores (regex contra "Falabella", "Liverpool", "Studio F", "Arturo Calle", etc.) | block + neutral fallback |
| Grounding: si la respuesta menciona un orderId, debe matchear exactamente el del tool result | block + neutral fallback |
| Grounding: si la respuesta cita una fecha/transportador/guía, debe coincidir con el tool result | block + neutral fallback |
| Mención de info privilegiada (precio interno, costo, comisión) | block + neutral fallback |

**R-GUARD-OUT-2 — Acción on block.** Response al cliente: `brandConfig.neutralFallbackText`. Se loguea `guardrail_violations.push("output_violation_<categoria>")`.

**R-GUARD-OUT-3 — Alerta sobre output blocks.** Cada output block dispara alerta a P3 Operador (vía AlertingService que se implementa en Unit 3 — en Unit 1 va a un log con flag `severity=high`).

---

## §5 — PII anonymization (M6) — Q3=A "Set completo retail Col"

**R-PII-1 — Patrones detectados.** El `anonymizePII()` reconoce y tokeniza:

| PII | Pattern | Token |
|---|---|---|
| Email | `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b` | `<EMAIL_N>` |
| Teléfono Col | `\b(?:\+57\s?)?(?:3\d{2}|6\d{2})\s?\d{3}\s?\d{4}\b` (móvil + fijo) | `<PHONE_N>` |
| Número de pedido | `\b(?:PP|SS|OS|AT)-\d{4}-\d{4,6}\b` (prefijo por marca) | `<ORDER_N>` |
| Tarjeta | `\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b` | `<CARD_N>` |
| Cédula CC/CE | `\b(?:CC\|CE)?\s?\d{6,10}\b` con contexto cercano de "cédula", "documento", "identificación" | `<DOC_N>` |

**R-PII-2 — Token monotónico por turno.** El `N` es 1-indexed y monotónico **dentro de un turno**. Múltiples ocurrencias del mismo email en un turno mapean al mismo token (`<EMAIL_1>` siempre se refiere al primer email). En el turno siguiente, el counter se resetea.

**R-PII-3 — Almacenamiento de mapping.** El mapping `<EMAIL_1> → <hash del email original>` se persiste en una tabla `pii_token_map` ligada al turn_id. **Nunca PII raw**. El mapping permite reversibilidad para mostrar al agente humano en handoff (Unit 3), no para logs.

**R-PII-4 — Aplicación obligatoria.** TODO write al `turn_log_audit` pasa por `anonymizePII()`. NO hay excepciones. Reforzado por tipo TypeScript: `LoggerService.logTurn()` solo acepta `outputTextRedacted: string` (tipo branded `RedactedText`).

**R-PII-5 — Detección incompleta — accepted risk.** Los regex son best-effort; PII en formatos no esperados (ej. cédula sin contexto) puede pasar al log. **Mitigación**: red team adicional pre-launch enfocado en PII leak; iterar regex; en Fase 2 considerar clasificador ML.

---

## §6 — Tool execution (M3)

**R-TOOL-1 — Retry policy.** Cada tool call:
- **Max retries**: 3
- **Backoff**: exponential — 100ms, 500ms, 2000ms
- **Retryable errors**: timeout, 5xx, network error
- **NO retryable**: 4xx (especialmente 401, 403, 404)

**R-TOOL-2 — Circuit breaker.** Si 5 fallos consecutivos en un tool → circuit breaker abierto:
- Ventana abierta: 30 segundos
- Durante ventana abierta: tool retorna error inmediato (no se hace HTTP call); response al cliente es "tool_unavailable" fallback.
- Después de 30s: half-open (próxima llamada decide).

**R-TOOL-3 — Timeout.** Cada tool call individual: timeout duro de **10 segundos** (configurable por env var).

**R-TOOL-4 — Logging del tool.** Cada tool call (success o fail) se persiste en el turn record con: `{ name, latencyMs, success, errorClass | null }`. NO se persiste el input ni el output raw (esos viven solo en el log del turno como parte del text del LLM, ya PII-anonymizado).

---

## §7 — Rate limiting + cost controls (Q6=A)

**R-RATE-1 — Token budget per turn.**
- `max_tokens_out = 2000` en cada Bedrock invocation. El SDK enforza esto; si el modelo intenta exceder, trunca.
- Si la respuesta truncada es < 100 tokens, se considera "respuesta inválida" → neutral fallback.

**R-RATE-2 — Rate limit per IP.** En `/chat`:
- **30 requests por minute** por IP (sliding window).
- Si se excede → HTTP 429 con `Retry-After` header.
- Implementación: `@fastify/rate-limit` plugin.

**R-RATE-3 — Rate limit per conversation.**
- **10 turns por minuto** por `conversationId`.
- Si se excede → response al cliente "estás escribiendo muy rápido, dame un momento" + log.

**R-RATE-4 — Fail-closed defaults.** Si cualquier rate limit no se puede evaluar (Redis no-disponible, etc.) → bloquear por default (fail-closed). En MVP sin Redis, el contador vive en Postgres con índice + TTL.

---

## §8 — Session lifecycle (M4)

**R-SESS-1 — TTL inactividad.** 30 minutos de inactividad → conversation cerrada (estado `closed`). Cliente puede iniciar nueva conversación; consent se vuelve a pedir.

**R-SESS-2 — Job cleanup.** `session-cleanup.job` corre cada 30 minutos, marca conversaciones con `lastActivityAt > 30min ago` como `closed`. NO se eliminan los datos — solo se marcan.

**R-SESS-3 — Multi-turn dentro de la sesión.** Mientras una conversation está `active`, el contexto de turnos anteriores se reenvía al LLM (últimos N turnos, configurable; MVP default N=10) para coherencia multi-turn.

**R-SESS-4 — Conversación nueva on session expire.** Si el cliente intenta enviar mensaje a una conversation cerrada → bot inicia nueva conversation, re-pide consent.

---

## §9 — Error handling defaults (SECURITY-15)

**R-ERR-1 — Fail-closed.** Cualquier error no-categorizado → response al cliente: `"Estamos teniendo un problema técnico, intenta en unos minutos."` + log + alerta.

**R-ERR-2 — Errores user-facing genéricos.** NUNCA exponer stack traces, paths internos, queries SQL, mensajes de Bedrock raw, etc. al cliente.

**R-ERR-3 — Logging y alertas.** Todo error no-recoverable se loguea con `severity` + `error_class` + `correlation_id`. Alertas críticas:
- Bedrock unreachable > 1 min → alerta a Operador
- SFCC circuit breaker abierto > 5 min → alerta a Operador
- Postgres unreachable → alerta inmediata (sistema no operativo)

**R-ERR-4 — Recovery vs degrade.** Para errores recuperables (tool transient, LLM rate limit) → retry. Para errores no recuperables (validación, autenticación, PII pattern crítico) → fail-closed inmediato.

---

## §10 — Security Compliance Summary

| Rule | Status | Notas |
|---|---|---|
| SECURITY-05 (input validation) | Aplicado | R-GUARD-IN-1, Step 1 Zod, R-RATE-1 token cap |
| SECURITY-08 (access control) | Aplicado parcial | Endpoints aún sin auth middleware definido — eso va a Unit 2/3 cuando se agreguen admin routes |
| SECURITY-09 (hardening / no internal info leak) | Aplicado | R-GUARD-OUT-1 grounding + R-ERR-2 |
| SECURITY-11 (secure design) | Aplicado | R-GUARD layers + R-RATE limits + R-CONS gate como módulos dedicados |
| SECURITY-13 (data integrity) | Aplicado | R-CONS-5 append-only consent log; R-PII-3 token map |
| SECURITY-15 (error handling) | Aplicado | R-ERR-1..4 fail-closed defaults |
| SECURITY-01, 02, 03, 04, 06, 07, 10, 12, 14 | N/A en este stage | Infra/deploy/code-level — evaluados en stages siguientes |

*No hay findings bloqueantes en este stage.*
